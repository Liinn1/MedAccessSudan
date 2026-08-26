<?php

namespace Tests\Feature\Api\V1\Patient;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PatientProfileManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_can_update_only_their_own_approved_profile_fields(): void
    {
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        $other = User::factory()->create(['role' => UserRole::Patient, 'email' => 'other@example.com']);
        Sanctum::actingAs($patient);

        $this->putJson('/api/v1/patient/profile', [
            'first_name' => ' Amira ',
            'last_name' => ' Hassan ',
            'email' => 'amira@example.com',
            'phone' => '+249 111 222 333',
            'role' => 'administrator',
        ])->assertOk()
            ->assertJsonPath('data.user.name', 'Amira Hassan')
            ->assertJsonPath('data.user.email', 'amira@example.com');

        $this->assertDatabaseHas('users', ['id' => $patient->id, 'name' => 'Amira Hassan', 'phone' => '+249 111 222 333', 'role' => UserRole::Patient->value]);
        $this->assertSame('other@example.com', $other->fresh()->email);
    }

    public function test_profile_update_validates_uniqueness_and_patient_role(): void
    {
        $existing = User::factory()->create(['email' => 'used@example.com', 'phone' => '+249111111111']);
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);

        $this->putJson('/api/v1/patient/profile', [
            'first_name' => '',
            'last_name' => 'Patient',
            'email' => $existing->email,
            'phone' => $existing->phone,
        ])->assertUnprocessable()->assertJsonValidationErrors(['first_name', 'email', 'phone']);

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Doctor]));
        $this->putJson('/api/v1/patient/profile', [
            'first_name' => 'Doctor', 'last_name' => 'User', 'email' => 'doctor-new@example.com', 'phone' => '+249122222222',
        ])->assertForbidden();
    }
}
