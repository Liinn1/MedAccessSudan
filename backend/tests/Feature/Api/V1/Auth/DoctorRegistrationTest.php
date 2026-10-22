<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Models\Location;
use App\Models\User;
use App\Services\ProviderVerificationService;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DoctorRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_doctor_registration_requires_identity_and_professional_fields(): void
    {
        $this->postJson('/api/v1/auth/register/doctor')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name', 'last_name', 'email', 'phone', 'password', 'specialization', 'location', 'address']);
    }

    public function test_doctor_registers_logged_out_is_not_professionally_verified_and_must_confirm_email_before_login(): void
    {
        Storage::fake('public');
        Notification::fake();
        $location = Location::query()->where('code', 'SD-KH')->firstOrFail();
        $payload = [
            'first_name' => 'Musa',
            'last_name' => 'Ahmed',
            'email' => 'musa.doctor@example.com',
            'phone' => '+249111222555',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
            'specialization' => 'general_medicine',
            'location' => $location->code,
            'address' => 'Khartoum, Al Riyadh, Street 15',
            'profile_photo' => UploadedFile::fake()->createWithContent(
                'doctor.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=')
            ),
        ];

        $this->postJson('/api/v1/auth/register/doctor', $payload)
            ->assertCreated()
            ->assertJsonPath('data.user.role', 'doctor');

        $this->assertGuest();
        $doctor = User::query()->where('email', $payload['email'])->firstOrFail();
        $this->assertSame(UserRole::Doctor, $doctor->role);
        $this->assertTrue(Hash::check($payload['password'], $doctor->password));
        $this->assertSame('pending_documents', $doctor->doctorProfile->verification_status);
        $this->assertNull($doctor->email_verified_at);
        Notification::assertSentTo($doctor, VerifyEmail::class);

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'identifier' => $payload['email'],
            'password' => $payload['password'],
        ])->assertForbidden()->assertJsonPath('code', 'EMAIL_UNVERIFIED');

        $doctor->markEmailAsVerified();

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'identifier' => $payload['email'],
            'password' => $payload['password'],
        ])->assertOk()->assertJsonPath('data.user.role', 'doctor');

        $this->assertAuthenticatedAs($doctor);
    }

    public function test_doctor_registration_rejects_duplicate_email(): void
    {
        Storage::fake('public');
        User::factory()->create(['email' => 'existing.doctor@example.com']);

        $payload = $this->payload(['email' => 'existing.doctor@example.com']);

        $this->postJson('/api/v1/auth/register/doctor', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_doctor_registration_rejects_an_invalid_city(): void
    {
        $this->postJson('/api/v1/auth/register/doctor', $this->payload([
            'location' => 'not-a-city',
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['location']);

        $this->assertDatabaseMissing('users', ['email' => 'musa.doctor@example.com']);
    }

    public function test_doctor_registration_rolls_back_user_and_photo_when_verification_creation_fails(): void
    {
        Storage::fake('public');
        $verification = \Mockery::mock(ProviderVerificationService::class);
        $verification->shouldReceive('ensure')->once()->andThrow(new \RuntimeException('Forced verification failure.'));
        $this->app->instance(ProviderVerificationService::class, $verification);

        $payload = $this->payload(['email' => 'rollback.doctor@example.com']);

        $this->postJson('/api/v1/auth/register/doctor', $payload)->assertServerError();

        $this->assertDatabaseMissing('users', ['email' => $payload['email']]);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Musa',
            'last_name' => 'Ahmed',
            'email' => 'musa.doctor@example.com',
            'phone' => '+249111222555',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
            'specialization' => 'general_medicine',
            'location' => 'SD-KH',
            'address' => 'Khartoum, Al Riyadh, Street 15',
            'profile_photo' => UploadedFile::fake()->createWithContent(
                'doctor.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=')
            ),
        ], $overrides);
    }
}
