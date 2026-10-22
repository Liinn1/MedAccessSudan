<?php

namespace Tests\Feature\Api\V1\Patient;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\LaboratoryOrder;
use App\Models\LaboratoryProfile;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PatientUpcomingBookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_upcoming_bookings_are_unified_filtered_ordered_and_patient_scoped(): void
    {
        CarbonImmutable::setTestNow('2026-10-15 09:00:00');
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        $otherPatient = User::factory()->create(['role' => UserRole::Patient]);
        $doctor = $this->doctor();
        $laboratory = $this->laboratory();

        $laterToday = $this->appointment($patient, $doctor, '2026-10-15 09:15:00', 'clinic');
        $homeVisit = $this->appointment($patient, $doctor, '2026-10-15 10:00:00', 'home_visit');
        $labVisit = $this->laboratoryOrder($patient, $laboratory, '2026-10-15 11:00:00', 'at_lab');
        $homeCollection = $this->laboratoryOrder($patient, $laboratory, '2026-10-15 12:00:00', 'home_collection');

        $this->appointment($patient, $doctor, '2026-10-14 09:00:00', 'clinic');
        $this->appointment($patient, $doctor, '2026-10-15 13:00:00', 'clinic', 'cancelled');
        $this->appointment($patient, $doctor, '2026-10-15 14:00:00', 'clinic', 'completed');
        $this->laboratoryOrder($patient, $laboratory, '2026-10-15 15:00:00', 'at_lab', 'result_ready');
        $this->laboratoryOrder($patient, $laboratory, '2026-10-15 16:00:00', 'home_collection', 'in_progress');
        $this->appointment($otherPatient, $doctor, '2026-10-15 09:30:00', 'clinic');
        $this->laboratoryOrder($otherPatient, $laboratory, '2026-10-15 09:45:00', 'at_lab');

        Sanctum::actingAs($patient);
        $response = $this->getJson('/api/v1/patient/upcoming-bookings')->assertOk();

        $this->assertSame(
            ['clinic_visit', 'home_visit', 'laboratory', 'laboratory'],
            $response->json('data.*.type'),
        );
        $this->assertSame(
            [$laterToday->id, $homeVisit->id],
            collect($response->json('data'))->whereIn('type', ['clinic_visit', 'home_visit'])->pluck('appointment.id')->values()->all(),
        );
        $this->assertSame(
            [$labVisit->id, $homeCollection->id],
            collect($response->json('data'))->where('type', 'laboratory')->pluck('laboratory_order.id')->values()->all(),
        );
        $this->assertSame('at_lab', $response->json('data.2.laboratory_order.collection_method'));
        $this->assertSame('home_collection', $response->json('data.3.laboratory_order.collection_method'));
    }

    private function doctor(): DoctorProfile
    {
        return DoctorProfile::query()->create([
            'user_id' => User::factory()->create(['role' => UserRole::Doctor])->id,
            'specialization_id' => Specialization::query()->firstOrFail()->id,
            'location_id' => Location::query()->firstOrFail()->id,
            'verification_status' => 'verified',
        ]);
    }

    private function laboratory(): LaboratoryProfile
    {
        return LaboratoryProfile::query()->create([
            'user_id' => User::factory()->create(['role' => UserRole::Laboratory])->id,
            'location_id' => Location::query()->firstOrFail()->id,
            'name' => 'Unified Diagnostics',
            'address' => 'Khartoum',
            'verification_status' => 'verified',
        ]);
    }

    private function appointment(User $patient, DoctorProfile $doctor, string $startsAt, string $type, string $status = 'confirmed'): Appointment
    {
        $start = CarbonImmutable::parse($startsAt);

        return Appointment::query()->create([
            'patient_id' => $patient->id,
            'doctor_profile_id' => $doctor->id,
            'starts_at' => $start,
            'ends_at' => $start->addMinutes(30),
            'status' => $status,
            'service_type' => $type,
        ]);
    }

    private function laboratoryOrder(User $patient, LaboratoryProfile $laboratory, string $startsAt, string $method, string $status = 'requested'): LaboratoryOrder
    {
        return LaboratoryOrder::query()->create([
            'reference' => 'LAB-TEST-'.fake()->unique()->numberBetween(1000, 9999),
            'patient_id' => $patient->id,
            'laboratory_profile_id' => $laboratory->id,
            'laboratory_name_snapshot' => $laboratory->name,
            'status' => $status,
            'requested_at' => CarbonImmutable::now(),
            'collection_method' => $method,
            'collection_starts_at' => CarbonImmutable::parse($startsAt),
        ]);
    }
}
