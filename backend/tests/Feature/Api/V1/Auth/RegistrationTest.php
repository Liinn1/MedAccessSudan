<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Models\User;
use App\Services\RegistrationVerificationEmailService;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
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

    public function test_patient_registers_logged_out_and_must_verify_email_before_login(): void
    {
        Notification::fake();

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
            ->assertJsonPath('data.user.role', 'patient')
            ->assertJsonPath('account_created', true)
            ->assertJsonPath('verification_email_sent', true);

        $this->assertGuest();
        $patient = User::query()->where('email', $payload['email'])->firstOrFail();
        $this->assertSame(UserRole::Patient, $patient->role);
        $this->assertTrue(Hash::check($payload['password'], $patient->password));
        $this->assertNull($patient->email_verified_at);
        Notification::assertSentTo($patient, VerifyEmail::class);

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'identifier' => $payload['email'],
            'password' => $payload['password'],
        ])->assertForbidden()->assertJsonPath('code', 'EMAIL_UNVERIFIED');

        $this->assertGuest();

        $patient->markEmailAsVerified();

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'identifier' => $payload['email'],
            'password' => $payload['password'],
        ])->assertOk()->assertJsonPath('data.user.role', 'patient');

        $this->assertAuthenticatedAs($patient);
    }

    public function test_patient_registration_rejects_duplicate_email_and_cannot_assign_admin_role(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'existing@example.com']);

        $payload = [
            'first_name' => 'Amina',
            'last_name' => 'Hassan',
            'email' => 'existing@example.com',
            'phone' => '+249111222445',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
            'role' => 'admin',
        ];

        $this->postJson('/api/v1/auth/register', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('validation_codes.email.0', 'unique');

        $payload['email'] = 'patient.only@example.com';
        $payload['phone'] = '+249111222446';

        $this->postJson('/api/v1/auth/register', $payload)
            ->assertCreated()
            ->assertJsonPath('data.user.role', 'patient');

        $this->assertSame(UserRole::Patient, User::where('email', $payload['email'])->firstOrFail()->role);
    }

    public function test_patient_registration_reports_invalid_email_separately_from_duplicate_email(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'first_name' => 'Amina',
            'last_name' => 'Hassan',
            'email' => 'not-an-email',
            'phone' => '+249111222447',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('validation_codes.email.0', 'email');
    }

    public function test_patient_account_remains_created_and_unverified_when_verification_email_delivery_fails(): void
    {
        $this->mock(RegistrationVerificationEmailService::class)
            ->shouldReceive('send')
            ->once()
            ->andReturnFalse();

        $this->postJson('/api/v1/auth/register', [
            'first_name' => 'Maha',
            'last_name' => 'Osman',
            'email' => 'maha@example.com',
            'phone' => '+249111222448',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
        ])->assertCreated()
            ->assertJsonPath('account_created', true)
            ->assertJsonPath('verification_email_sent', false)
            ->assertJsonPath('code', 'ACCOUNT_CREATED_BUT_VERIFICATION_EMAIL_FAILED');

        $patient = User::query()->where('email', 'maha@example.com')->firstOrFail();
        $this->assertNull($patient->email_verified_at);
    }
}
