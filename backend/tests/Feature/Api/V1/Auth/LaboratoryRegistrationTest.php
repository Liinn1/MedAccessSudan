<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\DoctorVerificationStatus;
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

class LaboratoryRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_laboratory_registration_requires_account_and_location_fields(): void
    {
        $this->postJson('/api/v1/auth/register/laboratory')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['laboratory_name', 'email', 'phone', 'password', 'address', 'location']);
    }

    public function test_invalid_location_code_is_rejected(): void
    {
        $this->postJson('/api/v1/auth/register/laboratory', $this->payload([
            'location' => 'not-a-city',
        ]))->assertUnprocessable()->assertJsonValidationErrors(['location']);
    }

    public function test_laboratory_registers_logged_out_pending_and_must_verify_email(): void
    {
        Storage::fake('public');
        Notification::fake();
        config()->set('medaccess.demo_auto_verify_doctors', false);
        $location = Location::query()->where('code', 'khartoum')->firstOrFail();
        $payload = $this->payload(['location' => $location->code]);

        $this->postJson('/api/v1/auth/register/laboratory', $payload)
            ->assertCreated()
            ->assertJsonPath('data.user.role', 'laboratory');

        $this->assertGuest();
        $lab = User::query()->where('email', $payload['email'])->firstOrFail();
        $this->assertSame(UserRole::Laboratory, $lab->role);
        $this->assertTrue(Hash::check($payload['password'], $lab->password));
        $this->assertSame(DoctorVerificationStatus::Pending->value, $lab->laboratoryProfile->verification_status);
        $this->assertSame($location->id, $lab->laboratoryProfile->location_id);
        $this->assertSame('Near Al Riyadh, Building 12', $lab->laboratoryProfile->address);
        $this->assertNull($lab->email_verified_at);
        Notification::assertSentTo($lab, VerifyEmail::class);

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'identifier' => $payload['email'],
            'password' => $payload['password'],
        ])->assertForbidden()->assertJsonPath('code', 'EMAIL_UNVERIFIED');

        $lab->markEmailAsVerified();
        $lab->laboratoryProfile->refresh();
        $this->assertSame(DoctorVerificationStatus::Pending->value, $lab->laboratoryProfile->verification_status);

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'identifier' => $payload['email'],
            'password' => $payload['password'],
        ])->assertOk()->assertJsonPath('data.user.role', 'laboratory');
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'laboratory_name' => 'Nile Diagnostics',
            'email' => 'nile.lab@example.com',
            'phone' => '+249111333444',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
            'address' => 'Near Al Riyadh, Building 12',
            'profile_photo' => UploadedFile::fake()->createWithContent(
                'lab.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=')
            ),
        ], $overrides);
    }
}
