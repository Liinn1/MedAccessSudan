<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Mail\PasswordResetCodeMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_does_not_reveal_whether_an_email_is_registered(): void
    {
        Mail::fake();
        User::factory()->create(['email' => 'reset.known@example.com', 'email_verified_at' => now()]);

        $known = $this->postJson('/api/v1/auth/password/forgot', ['email' => 'reset.known@example.com']);
        $unknown = $this->postJson('/api/v1/auth/password/forgot', ['email' => 'missing@example.com']);

        $known->assertOk()->assertJsonPath('message', 'If an account exists for this email, we\'ve sent password reset instructions.');
        $unknown->assertOk()->assertJsonPath('message', 'If an account exists for this email, we\'ve sent password reset instructions.');
        $this->assertNotEmpty($known->json('data.challenge_id'));
        $this->assertArrayNotHasKey('code', $known->json('data'));
        Mail::assertSent(PasswordResetCodeMail::class, 1);
    }

    public function test_patient_can_reset_password_with_a_valid_code_and_old_password_stops_working(): void
    {
        Mail::fake();
        $user = User::factory()->create([
            'email' => 'reset.patient@example.com',
            'role' => UserRole::Patient,
            'password' => 'OldPass123',
            'email_verified_at' => now(),
        ]);

        $challengeId = $this->postJson('/api/v1/auth/password/forgot', ['email' => $user->email])
            ->assertOk()
            ->json('data.challenge_id');
        $code = $this->lastResetCode();

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => $user->email,
            'challenge_id' => $challengeId,
            'code' => $code,
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewPass123', $user->fresh()->password));
        $this->postJson('/api/v1/auth/login', [
            'identifier' => $user->email,
            'password' => 'OldPass123',
        ])->assertUnprocessable();
        $this->postJson('/api/v1/auth/login', [
            'identifier' => $user->email,
            'password' => 'NewPass123',
        ])->assertOk();
    }

    public function test_admin_can_reset_password_without_changing_role(): void
    {
        Mail::fake();
        $admin = User::factory()->create([
            'email' => 'reset.admin@example.com',
            'role' => UserRole::Admin,
            'is_active' => true,
            'password' => 'OldPass123',
        ]);

        $challengeId = $this->postJson('/api/v1/auth/password/forgot', ['email' => $admin->email])->assertOk()->json('data.challenge_id');
        $code = $this->lastResetCode();

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => $admin->email,
            'challenge_id' => $challengeId,
            'code' => $code,
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ])->assertOk();

        $this->assertSame(UserRole::Admin, $admin->fresh()->role);
        $this->postJson('/api/v1/admin/login', [
            'identifier' => $admin->email,
            'password' => 'NewPass123',
        ])->assertOk()->assertJsonPath('data.user.role', 'admin');
    }

    public function test_invalid_reset_code_does_not_change_the_password(): void
    {
        Mail::fake();
        $user = User::factory()->create([
            'email' => 'reset.invalid@example.com',
            'password' => 'KeepPass123',
            'email_verified_at' => now(),
        ]);

        $challengeId = $this->postJson('/api/v1/auth/password/forgot', ['email' => $user->email])->json('data.challenge_id');
        $this->postJson('/api/v1/auth/password/reset', [
            'email' => $user->email,
            'challenge_id' => $challengeId,
            'code' => '000000',
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ])->assertUnprocessable();

        $this->assertTrue(Hash::check('KeepPass123', $user->fresh()->password));
    }

    public function test_expired_reset_challenge_is_rejected(): void
    {
        Mail::fake();
        $user = User::factory()->create([
            'email' => 'reset.expired@example.com',
            'password' => 'KeepPass123',
            'email_verified_at' => now(),
        ]);

        $challengeId = $this->postJson('/api/v1/auth/password/forgot', ['email' => $user->email])->json('data.challenge_id');
        Cache::flush();

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => $user->email,
            'challenge_id' => $challengeId,
            'code' => '123456',
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ])->assertUnprocessable();

        $this->assertTrue(Hash::check('KeepPass123', $user->fresh()->password));
    }

    private function lastResetCode(): string
    {
        $code = null;
        Mail::assertSent(PasswordResetCodeMail::class, function (PasswordResetCodeMail $mail) use (&$code) {
            $code = $mail->code;

            return true;
        });
        $this->assertNotEmpty($code);

        return $code;
    }
}
