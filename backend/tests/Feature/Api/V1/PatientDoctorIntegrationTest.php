<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Models\DoctorAvailabilitySchedule;
use App\Models\DoctorProfile;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PatientDoctorIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_one_appointment_is_shared_from_patient_booking_through_doctor_completion(): void
    {
        CarbonImmutable::setTestNow('2026-10-17 08:00:00 Africa/Khartoum');

        $patient = User::factory()->create(['role' => UserRole::Patient]);
        $doctorUser = User::factory()->create(['role' => UserRole::Doctor]);
        $doctor = DoctorProfile::create([
            'user_id' => $doctorUser->id,
            'specialization_id' => Specialization::query()->firstOrFail()->id,
            'location_id' => Location::query()->firstOrFail()->id,
            'clinic_name' => 'Integration Clinic',
            'verification_status' => 'verified',
            'offers_clinic_visits' => true,
            'address' => 'Khartoum, Al Riyadh',
        ]);
        $startsAt = CarbonImmutable::now(config('app.timezone'))->addDay()->startOfDay()->setTime(9, 0);

        DoctorAvailabilitySchedule::create([
            'doctor_profile_id' => $doctor->id,
            'consultation_type' => 'clinic',
            'day_of_week' => $startsAt->dayOfWeek,
            'start_time' => '09:00',
            'end_time' => '10:00',
            'slot_duration_minutes' => 30,
            'is_active' => true,
        ]);

        Sanctum::actingAs($patient);
        $booking = $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $doctor->id,
            'starts_at' => $startsAt->toIso8601String(),
            'service_type' => 'clinic',
            'payment_method' => 'pay_later',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.doctor.id', $doctor->id);

        $appointmentId = $booking->json('data.id');
        $this->assertDatabaseHas('appointments', [
            'id' => $appointmentId,
            'patient_id' => $patient->id,
            'doctor_profile_id' => $doctor->id,
            'status' => 'confirmed',
            'service_type' => 'clinic',
        ]);

        $this->getJson('/api/v1/patient/appointments')
            ->assertOk()
            ->assertJsonPath('data.0.id', $appointmentId)
            ->assertJsonPath('data.0.status', 'confirmed');

        Sanctum::actingAs($doctorUser);
        $this->getJson('/api/v1/doctor/appointments')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $appointmentId)
            ->assertJsonPath('data.0.patient.id', $patient->id);

        CarbonImmutable::setTestNow($startsAt->addHour());
        $this->patchJson("/api/v1/doctor/appointments/{$appointmentId}/start")
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->patchJson("/api/v1/doctor/appointments/{$appointmentId}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        Sanctum::actingAs($patient);
        $this->getJson("/api/v1/patient/appointments/{$appointmentId}")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->assertDatabaseCount('appointments', 1);
        $this->assertDatabaseHas('appointments', ['id' => $appointmentId, 'status' => 'completed']);
    }

    public function test_doctor_public_profile_and_schedule_updates_reach_patient_discovery_apis(): void
    {
        CarbonImmutable::setTestNow('2026-10-17 08:00:00 Africa/Khartoum');

        $doctorUser = User::factory()->create(['role' => UserRole::Doctor]);
        $doctor = DoctorProfile::create([
            'user_id' => $doctorUser->id,
            'specialization_id' => Specialization::query()->firstOrFail()->id,
            'location_id' => Location::query()->firstOrFail()->id,
            'clinic_name' => 'Old Clinic Name',
            'verification_status' => 'verified',
            'offers_clinic_visits' => true,
        ]);
        $slotDate = CarbonImmutable::now(config('app.timezone'))->addDay()->startOfDay();

        Sanctum::actingAs($doctorUser);
        $this->putJson('/api/v1/doctor/profile', [
            'clinic_name' => 'Unified Care Clinic',
            'biography' => 'Patient-visible professional biography.',
            'biography_language' => 'en',
            'location' => 'SD-KH',
            'address' => 'Khartoum, Al Riyadh, Street 15',
        ])->assertOk();
        $this->putJson('/api/v1/doctor/schedule', [
            'consultation_type' => 'clinic',
            'periods' => [[
                'day_of_week' => $slotDate->dayOfWeek,
                'start_time' => '09:00',
                'end_time' => '10:00',
                'slot_duration_minutes' => 30,
                'is_active' => true,
            ]],
        ])->assertOk();

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient]));
        $this->getJson('/api/v1/patient/doctors')
            ->assertOk()
            ->assertJsonPath('data.doctors.0.id', $doctor->id)
            ->assertJsonPath('data.doctors.0.clinic_name', 'Unified Care Clinic');
        $this->getJson("/api/v1/patient/doctors/{$doctor->id}")
            ->assertOk()
            ->assertJsonPath('data.biography', 'Patient-visible professional biography.');
        $this->getJson("/api/v1/patient/doctors/{$doctor->id}/availability?from={$slotDate->toDateString()}&to={$slotDate->toDateString()}&service_type=clinic")
            ->assertOk()
            ->assertJsonPath('data.doctor_id', $doctor->id)
            ->assertJsonCount(2, 'data.dates.0.slots');
    }
}
