<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Models\Location;
use App\Models\User;
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
            ->assertJsonValidationErrors(['first_name', 'last_name', 'email', 'phone', 'password', 'specialization', 'location']);
    }

    public function test_demo_doctor_registers_logged_out_is_professionally_verified_and_must_confirm_email_before_login(): void
    {
        Storage::fake('public');
        Notification::fake();
        config()->set('medaccess.demo_auto_verify_doctors', true);
        $location = Location::query()->where('code', 'khartoum')->firstOrFail();
        $payload = [
            'first_name' => 'Musa',
            'last_name' => 'Ahmed',
            'email' => 'musa.doctor@example.com',
            'phone' => '+249111222555',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
            'specialization' => 'general_medicine',
            'location' => $location->code,
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
        $this->assertSame('verified', $doctor->doctorProfile->verification_status);
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
}
