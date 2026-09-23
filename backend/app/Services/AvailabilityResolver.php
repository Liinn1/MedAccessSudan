<?php

namespace App\Services;

use App\Enums\AppointmentServiceType;
use App\Enums\AppointmentStatus;
use App\Models\DoctorProfile;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class AvailabilityResolver
{
    /**
     * Resolve bookable slots in the application timezone for an inclusive date range.
     *
     * Modified-day exceptions replace the regular schedule for that day, blocked
     * exceptions remove overlapping slots, and confirmed appointments always win
     * across every consultation type so the doctor cannot be double-booked.
     *
     * @return array<int, array{date:string,slots:array<int,array{starts_at:string,ends_at:string,consultation_type:string}>}>
     */
    public function resolve(DoctorProfile $doctor, CarbonImmutable $from, CarbonImmutable $to, ?AppointmentServiceType $consultationType = null): array
    {
        if ($to->lt($from) || $from->diffInDays($to) > 31) {
            throw new InvalidArgumentException('Availability range must be between 1 and 31 days.');
        }
        if ($doctor->exists) {
            $doctor->load([
                'schedules' => fn ($query) => $query->where('is_active', true)->orderBy('start_time'),
                'exceptions',
                'appointments' => fn ($query) => $query->where('status', AppointmentStatus::Confirmed->value)
                    ->where('ends_at', '>', $from)->where('starts_at', '<', $to->endOfDay()),
            ]);
        }

        $types = $consultationType ? [$consultationType] : $this->offeredTypes($doctor);
        $now = CarbonImmutable::now(config('app.timezone'));
        $result = [];
        for ($date = $from->startOfDay(); $date->lte($to->startOfDay()); $date = $date->addDay()) {
            $slots = [];
            foreach ($types as $type) {
                $exceptions = $doctor->exceptions->filter(function ($item) use ($date, $type) {
                    if ($item->exception_date->toDateString() !== $date->toDateString()) {
                        return false;
                    }

                    return $this->exceptionType($item) === $type;
                });
                $windows = $this->windowsForDate($this->schedulesForType($doctor->schedules, $type), $exceptions, $date);
                foreach ($windows as $window) {
                    for ($start = $window['start']; $start->addMinutes($window['duration'])->lte($window['end']); $start = $start->addMinutes($window['duration'])) {
                        $end = $start->addMinutes($window['duration']);
                        if ($start->lte($now) || $this->isBlocked($start, $end, $exceptions) || $this->hasAppointment($start, $end, $doctor->appointments)) {
                            continue;
                        }
                        $slots[] = [
                            'starts_at' => $start->toIso8601String(),
                            'ends_at' => $end->toIso8601String(),
                            'consultation_type' => $type->value,
                        ];
                    }
                }
            }
            usort($slots, fn (array $left, array $right) => strcmp($left['starts_at'], $right['starts_at']));
            if ($slots !== []) {
                $result[] = ['date' => $date->toDateString(), 'slots' => $slots];
            }
        }

        return $result;
    }

    /** @return list<AppointmentServiceType> */
    private function offeredTypes(DoctorProfile $doctor): array
    {
        $types = [];
        if ($doctor->offers(AppointmentServiceType::Clinic)) {
            $types[] = AppointmentServiceType::Clinic;
        }
        if ($doctor->offers(AppointmentServiceType::HomeVisit)) {
            $types[] = AppointmentServiceType::HomeVisit;
        }

        return $types !== [] ? $types : [AppointmentServiceType::Clinic];
    }

    private function schedulesForType(Collection $schedules, AppointmentServiceType $type): Collection
    {
        return $schedules->filter(function ($period) use ($type) {
            $periodType = $period->consultation_type ?? AppointmentServiceType::Clinic;

            return ($periodType instanceof AppointmentServiceType ? $periodType : AppointmentServiceType::from((string) $periodType)) === $type;
        });
    }

    private function exceptionType($exception): AppointmentServiceType
    {
        $type = $exception->consultation_type ?? AppointmentServiceType::Clinic;

        return $type instanceof AppointmentServiceType ? $type : AppointmentServiceType::from((string) $type);
    }

    private function windowsForDate(Collection $schedules, Collection $exceptions, CarbonImmutable $date): array
    {
        if ($exceptions->contains(fn ($item) => $item->type === 'unavailable')) {
            return [];
        }
        $modified = $exceptions->where('type', 'modified');
        $source = $modified->isNotEmpty() ? $modified : $schedules->where('day_of_week', $date->dayOfWeek);

        return $source->map(function ($period) use ($date, $schedules) {
            $duration = $period->slot_duration_minutes ?? $schedules->where('day_of_week', $date->dayOfWeek)->first()?->slot_duration_minutes ?? 30;

            return [
                'start' => CarbonImmutable::parse($date->toDateString().' '.$period->start_time, config('app.timezone')),
                'end' => CarbonImmutable::parse($date->toDateString().' '.$period->end_time, config('app.timezone')),
                'duration' => (int) $duration,
            ];
        })->values()->all();
    }

    private function isBlocked(CarbonImmutable $start, CarbonImmutable $end, Collection $exceptions): bool
    {
        return $exceptions->where('type', 'blocked')->contains(function ($block) use ($start, $end) {
            $blockStart = CarbonImmutable::parse($start->toDateString().' '.$block->start_time, config('app.timezone'));
            $blockEnd = CarbonImmutable::parse($start->toDateString().' '.$block->end_time, config('app.timezone'));

            return $start->lt($blockEnd) && $end->gt($blockStart);
        });
    }

    private function hasAppointment(CarbonImmutable $start, CarbonImmutable $end, Collection $appointments): bool
    {
        return $appointments->contains(fn ($appointment) => $start->lt($appointment->ends_at) && $end->gt($appointment->starts_at));
    }
}
