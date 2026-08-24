<?php

namespace Tests\Feature\Api\V1\Doctor;

use App\Enums\UserRole;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScheduleValidationTest extends TestCase
{
    public function test_overlapping_periods_are_rejected_before_persistence(): void
    {
        $doctor = new User(['name' => 'Doctor', 'email' => 'doctor@example.com', 'role' => UserRole::Doctor]);
        $doctor->id = 8;
        Sanctum::actingAs($doctor);
        $this->putJson('/api/v1/doctor/schedule', ['periods' => [
            ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00', 'slot_duration_minutes' => 30],
            ['day_of_week' => 1, 'start_time' => '11:30', 'end_time' => '14:00', 'slot_duration_minutes' => 30],
        ]])->assertUnprocessable()->assertJsonValidationErrors('periods');
    }

    public function test_patient_cannot_manage_doctor_schedule(): void
    {
        $patient = new User(['name' => 'Patient', 'email' => 'patient@example.com', 'role' => UserRole::Patient]);
        $patient->id = 9;
        Sanctum::actingAs($patient);
        $this->putJson('/api/v1/doctor/schedule', ['periods' => []])->assertForbidden();
    }
}
