<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\DoctorVerificationStatus;
use App\Enums\UserRole;
use App\Models\Location;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_signed_verification_link_marks_the_account_verified_and_redirects_to_the_spa(): void
    {
        $user = $this->unverifiedPatient();
        config()->set('medaccess.frontend_url', 'http://127.0.0.1:5173');

        $this->get($this->verificationUrl($user))
            ->assertRedirect('http://127.0.0.1:5173/verify-email?status=success');

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_already_verified_link_does_not_error_and_redirects_already(): void
    {
        $user = $this->unverifiedPatient();
        $user->markEmailAsVerified();
        config()->set('medaccess.frontend_url', 'http://127.0.0.1:5173');

        $this->get($this->verificationUrl($user))
            ->assertRedirect('http://127.0.0.1:5173/verify-email?status=already');

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_invalid_signature_redirects_without_verifying(): void
    {
        $user = $this->unverifiedPatient();
        config()->set('medaccess.frontend_url', 'http://127.0.0.1:5173');

        $this->get('/email/verify/'.$user->id.'/'.sha1($user->getEmailForVerification()))
            ->assertRedirect('http://127.0.0.1:5173/verify-email?status=invalid');

        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_hash_mismatch_on_a_signed_url_is_rejected(): void
    {
        $user = $this->unverifiedPatient();
        config()->set('medaccess.frontend_url', 'http://127.0.0.1:5173');

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->id,
            'hash' => sha1('other@example.com'),
        ]);

        $this->get($url)->assertRedirect('http://127.0.0.1:5173/verify-email?status=invalid');
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_resend_endpoint_does_not_reveal_whether_an_email_exists(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => 'missing@example.com',
        ])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_resend_sends_notification_only_when_unverified(): void
    {
        Notification::fake();
        $user = $this->unverifiedPatient();

        $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => $user->email,
        ])->assertOk();

        Notification::assertSentTo($user, VerifyEmail::class);

        $user->markEmailAsVerified();
        Notification::fake();

        $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => $user->email,
        ])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_resend_is_throttled(): void
    {
        $email = ['email' => 'throttle@example.com'];

        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/v1/auth/email/verification-notification', $email)->assertOk();
        }

        $this->postJson('/api/v1/auth/email/verification-notification', $email)->assertStatus(429);
    }

    public function test_email_verification_does_not_approve_a_pending_doctor(): void
    {
        Storage::fake('public');
        Notification::fake();
        config()->set('medaccess.demo_auto_verify_doctors', false);
        config()->set('medaccess.frontend_url', 'http://127.0.0.1:5173');
        $location = Location::query()->where('code', 'khartoum')->firstOrFail();

        $this->postJson('/api/v1/auth/register/doctor', [
            'first_name' => 'Sara',
            'last_name' => 'Ali',
            'email' => 'sara.doctor@example.com',
            'phone' => '+249111222777',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
            'specialization' => 'general_medicine',
            'location' => $location->code,
            'profile_photo' => UploadedFile::fake()->createWithContent(
                'doctor.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=')
            ),
        ])->assertCreated();

        $doctor = User::query()->where('email', 'sara.doctor@example.com')->firstOrFail();
        $this->assertSame(DoctorVerificationStatus::PendingDocuments->value, $doctor->doctorProfile->verification_status);
        $this->assertNull($doctor->email_verified_at);
        Notification::assertSentTo($doctor, VerifyEmail::class);

        $this->get($this->verificationUrl($doctor))
            ->assertRedirect('http://127.0.0.1:5173/verify-email?status=success');

        $doctor->refresh();
        $this->assertTrue($doctor->hasVerifiedEmail());
        $this->assertSame(DoctorVerificationStatus::PendingDocuments->value, $doctor->doctorProfile->fresh()->verification_status);
    }

    private function unverifiedPatient(): User
    {
        return User::factory()->unverified()->create([
            'role' => UserRole::Patient,
            'first_name' => 'Amina',
            'last_name' => 'Hassan',
            'phone' => '+249199988877',
        ]);
    }

    private function verificationUrl(User $user): string
    {
        return URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);
    }
}
