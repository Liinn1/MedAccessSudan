<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_requires_all_patient_identity_fields(): void
    {
        $this->postJson('/api/v1/auth/register')
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'first_name',
                'last_name',
                'email',
                'phone',
                'password',
            ]);
    }

    public function test_patient_registers_logged_out_and_can_then_log_in(): void
    {
        $payload = [
            'first_name' => 'Amina',
            'last_name' => 'Hassan',
            'email' => 'amina@example.com',
            'phone' => '+249111222444',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
        ];

        $this->postJson('/api/v1/auth/register', $payload)
            ->assertCreated()
            ->assertJsonPath('data.user.role', 'patient');

        $this->assertGuest();
        $patient = User::query()->where('email', $payload['email'])->firstOrFail();
        $this->assertSame(UserRole::Patient, $patient->role);
        $this->assertTrue(Hash::check($payload['password'], $patient->password));

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'identifier' => $payload['email'],
            'password' => $payload['password'],
        ])->assertOk()->assertJsonPath('data.user.role', 'patient');

        $this->assertAuthenticatedAs($patient);
    }
}
