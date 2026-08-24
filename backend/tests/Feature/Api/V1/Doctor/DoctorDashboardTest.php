<?php

namespace Tests\Feature\Api\V1\Doctor;

use App\Enums\UserRole;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DoctorDashboardTest extends TestCase
{
    public function test_doctor_dashboard_requires_authentication(): void
    {
        $this->getJson('/api/v1/doctor/dashboard')->assertUnauthorized();
    }

    public function test_patient_cannot_access_doctor_dashboard(): void
    {
        $patient = new User(['name' => 'Patient', 'email' => 'patient@example.com', 'role' => UserRole::Patient]);
        $patient->id = 10;
        Sanctum::actingAs($patient);

        $this->getJson('/api/v1/doctor/dashboard')
            ->assertForbidden()
            ->assertJson(['code' => 'FORBIDDEN_ROLE']);
    }
}
