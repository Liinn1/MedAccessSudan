<?php

namespace Tests\Feature\Api\V1\Doctor;

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

class DoctorAppointmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_doctor_receives_only_assigned_appointments_in_time_order_with_safe_patient_data(): void
    {
        $doctor = $this->createDoctor();
        $otherDoctor = $this->createDoctor();
        $patient = User::factory()->create(['role' => UserRole::Patient, 'email' => 'private.patient@example.com', 'phone' => '+249111222777']);
        $start = CarbonImmutable::now(config('app.timezone'))->addDay()->startOfDay()->setTime(10, 0);

        $later = $this->createAppointment($doctor, $patient, $start->addHour());
        $earlier = $this->createAppointment($doctor, $patient, $start);
        $this->createAppointment($otherDoctor, $patient, $start);

        Sanctum::actingAs($doctor->user);
        $this->getJson('/api/v1/doctor/appointments')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $earlier->id)
            ->assertJsonPath('data.1.id', $later->id)
            ->assertJsonPath('data.0.patient.name', $patient->name)
            ->assertJsonMissing(['email' => $patient->email])
            ->assertJsonMissing(['phone' => $patient->phone]);
    }

    public function test_non_doctor_cannot_access_doctor_appointments(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient]));

        $this->getJson('/api/v1/doctor/appointments')->assertForbidden();
    }

    private function createDoctor(): DoctorProfile
    {
        return DoctorProfile::create([
            'user_id' => User::factory()->create(['role' => UserRole::Doctor])->id,
            'specialization_id' => Specialization::query()->firstOrFail()->id,
            'location_id' => Location::query()->firstOrFail()->id,
            'verification_status' => 'verified',
        ]);
    }

    private function createAppointment(DoctorProfile $doctor, User $patient, CarbonImmutable $start): Appointment
    {
        return Appointment::create([
            'patient_id' => $patient->id,
            'doctor_profile_id' => $doctor->id,
            'starts_at' => $start,
            'ends_at' => $start->addMinutes(30),
            'status' => 'confirmed',
            'service_type' => 'clinic',
        ]);
    }
}
