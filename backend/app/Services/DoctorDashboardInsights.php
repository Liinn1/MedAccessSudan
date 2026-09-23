<?php

namespace App\Services;

use App\Enums\AppointmentServiceType;
use App\Enums\AppointmentStatus;
use App\Models\DoctorProfile;
use Carbon\CarbonImmutable;

class DoctorDashboardInsights
{
    public function __construct(private readonly AvailabilityResolver $availabilityResolver) {}

    /** @return array<string, mixed> */
    public function build(DoctorProfile $profile): array
    {
        $timezone = (string) config('app.timezone');
        $today = CarbonImmutable::today($timezone);
        $weekStart = $today->startOfWeek(CarbonImmutable::MONDAY);
        $weekEnd = $weekStart->addDays(6);
        $horizon = $today->addDays(13);

        $appointments = $profile->appointments()
            ->with('patient:id,name')
            ->where('starts_at', '>=', $weekStart)
            ->where('starts_at', '<', $weekEnd->addDay())
            ->orderBy('starts_at')
            ->get();

        $upcoming = $profile->appointments()
            ->with('patient:id,name')
            ->where('status', AppointmentStatus::Confirmed->value)
            ->where('starts_at', '>=', CarbonImmutable::now($timezone))
            ->orderBy('starts_at')
            ->limit(5)
            ->get()
            ->map(fn ($appointment) => [
                'id' => $appointment->id,
                'starts_at' => $appointment->starts_at->toIso8601String(),
                'ends_at' => $appointment->ends_at->toIso8601String(),
                'status' => $appointment->status->value,
                'service_type' => $appointment->service_type->value,
                'patient_name' => $appointment->patient?->name,
            ])->all();

        $days = [];
        $totals = ['total' => 0, 'completed' => 0, 'upcoming' => 0, 'cancelled' => 0];
        for ($date = $weekStart; $date->lte($weekEnd); $date = $date->addDay()) {
            $dayAppointments = $appointments->filter(
                fn ($appointment) => $appointment->starts_at->timezone($timezone)->toDateString() === $date->toDateString()
            );
            $completed = $dayAppointments->where('status', AppointmentStatus::Completed)->count();
            $cancelled = $dayAppointments->where('status', AppointmentStatus::Cancelled)->count();
            $upcomingCount = $dayAppointments->where('status', AppointmentStatus::Confirmed)->count();
            $days[] = [
                'date' => $date->toDateString(),
                'weekday' => $date->dayOfWeek,
                'completed' => $completed,
                'upcoming' => $upcomingCount,
                'cancelled' => $cancelled,
            ];
            $totals['completed'] += $completed;
            $totals['upcoming'] += $upcomingCount;
            $totals['cancelled'] += $cancelled;
            $totals['total'] += $completed + $upcomingCount + $cancelled;
        }

        $nextSlots = [];
        $utilization = [];
        foreach ($this->activeTypes($profile) as $type) {
            $slots = collect($this->availabilityResolver->resolve($profile, $today, $horizon, $type))
                ->flatMap(fn (array $day) => $day['slots']);
            $nextSlots[$type->value] = $slots->first()['starts_at'] ?? null;

            $weekSlots = collect($this->availabilityResolver->resolve($profile, $weekStart, $weekEnd, $type))
                ->flatMap(fn (array $day) => $day['slots']);
            $booked = $appointments->filter(function ($appointment) use ($type) {
                if ($appointment->service_type !== $type) {
                    return false;
                }

                return in_array($appointment->status, [AppointmentStatus::Confirmed, AppointmentStatus::Completed], true);
            })->count();
            $available = $weekSlots->count();
            $utilization[$type->value] = [
                'booked' => $booked,
                'available' => $available,
            ];
        }

        $allBooked = array_sum(array_column($utilization, 'booked'));
        $allAvailable = array_sum(array_column($utilization, 'available'));

        return [
            'appointment_overview' => [
                'period' => 'week',
                'from' => $weekStart->toDateString(),
                'to' => $weekEnd->toDateString(),
                'totals' => $totals,
                'days' => $days,
            ],
            'slot_utilization' => [
                'period' => 'week',
                'from' => $weekStart->toDateString(),
                'to' => $weekEnd->toDateString(),
                'all' => ['booked' => $allBooked, 'available' => $allAvailable],
                'by_type' => $utilization,
            ],
            'next_available' => $nextSlots,
            'upcoming_appointments' => $upcoming,
        ];
    }

    /** @return list<AppointmentServiceType> */
    private function activeTypes(DoctorProfile $profile): array
    {
        $types = [];
        if ($profile->offers(AppointmentServiceType::Clinic)) {
            $types[] = AppointmentServiceType::Clinic;
        }
        if ($profile->offers(AppointmentServiceType::HomeVisit)) {
            $types[] = AppointmentServiceType::HomeVisit;
        }

        return $types;
    }
}
