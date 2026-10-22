<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Enums\LaboratoryOrderStatus;
use App\Models\Appointment;
use App\Models\LaboratoryOrder;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class PatientUpcomingBookingService
{
    /** @return Collection<int, array{type: string, scheduled_at: CarbonImmutable, appointment?: Appointment, laboratory_order?: LaboratoryOrder}> */
    public function forPatient(User $patient, ?CarbonImmutable $now = null): Collection
    {
        $now ??= CarbonImmutable::now();

        $appointments = Appointment::query()
            ->where('patient_id', $patient->id)
            ->where('status', AppointmentStatus::Confirmed->value)
            ->where('ends_at', '>=', $now)
            ->with(['doctorProfile.user', 'doctorProfile.specialization', 'doctorProfile.location', 'review', 'homeVisitDetail.location', 'payment'])
            ->get()
            ->map(fn (Appointment $appointment): array => [
                'type' => $appointment->service_type->value === 'home_visit' ? 'home_visit' : 'clinic_visit',
                'scheduled_at' => CarbonImmutable::instance($appointment->starts_at),
                'appointment' => $appointment,
            ]);

        $laboratoryOrders = LaboratoryOrder::query()
            ->where('patient_id', $patient->id)
            ->where('status', LaboratoryOrderStatus::Requested->value)
            ->whereNotNull('collection_starts_at')
            ->where('collection_starts_at', '>=', $now)
            ->with(['items', 'results', 'events', 'laboratoryProfile.location:id,code,name_en,name_ar', 'collectionLocation:id,code,name_en,name_ar', 'payment', 'review'])
            ->get()
            ->map(fn (LaboratoryOrder $order): array => [
                'type' => 'laboratory',
                'scheduled_at' => CarbonImmutable::instance($order->collection_starts_at),
                'laboratory_order' => $order,
            ]);

        return $appointments
            ->concat($laboratoryOrders)
            ->sortBy('scheduled_at')
            ->values();
    }
}
