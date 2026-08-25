<?php

namespace Tests\Feature\Api\V1\Patient;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PatientAppointmentManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_can_view_and_cancel_their_own_future_appointment(): void
    {
        [$patient, $appointment] = $this->appointmentFor(CarbonImmutable::now()->addDay());
        Sanctum::actingAs($patient);

        $this->getJson("/api/v1/patient/appointments/{$appointment->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $appointment->id)
            ->assertJsonPath('data.doctor.id', $appointment->doctor_profile_id);

        $this->patchJson("/api/v1/patient/appointments/{$appointment->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'cancelled']);
    }

    public function test_patient_cannot_view_or_cancel_another_patients_appointment(): void
    {
        [, $appointment] = $this->appointmentFor(CarbonImmutable::now()->addDay());
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient]));

        $this->getJson("/api/v1/patient/appointments/{$appointment->id}")->assertNotFound();
        $this->patchJson("/api/v1/patient/appointments/{$appointment->id}/cancel")->assertNotFound();
    }

    public function test_past_or_already_cancelled_appointment_cannot_be_cancelled(): void
    {
        [$patient, $past] = $this->appointmentFor(CarbonImmutable::now()->subDay());
        Sanctum::actingAs($patient);

        $this->patchJson("/api/v1/patient/appointments/{$past->id}/cancel")->assertConflict();

        $future = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_profile_id' => $past->doctor_profile_id,
            'starts_at' => CarbonImmutable::now()->addDays(2),
            'ends_at' => CarbonImmutable::now()->addDays(2)->addMinutes(30),
            'status' => 'cancelled',
            'service_type' => 'clinic',
        ]);
        $this->patchJson("/api/v1/patient/appointments/{$future->id}/cancel")->assertConflict();
    }

    private function appointmentFor(CarbonImmutable $startsAt): array
    {
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        $doctor = DoctorProfile::create([
            'user_id' => User::factory()->create(['role' => UserRole::Doctor])->id,
            'specialization_id' => Specialization::query()->firstOrFail()->id,
            'location_id' => Location::query()->firstOrFail()->id,
            'verification_status' => 'verified',
        ]);
        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_profile_id' => $doctor->id,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->addMinutes(30),
            'status' => 'confirmed',
            'service_type' => 'clinic',
        ]);

        return [$patient, $appointment];
    }
}
