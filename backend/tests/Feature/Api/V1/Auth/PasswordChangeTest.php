<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Mail\PasswordChangeCodeMail;
use App\Models\User;
use App\Services\PasswordChangeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordChangeTest extends TestCase
{
    use RefreshDatabase;

    public function test_wrong_current_password_is_rejected_and_password_stays_the_same(): void
    {
        $user = $this->patient();
        Sanctum::actingAs($user);
        $this->postJson('/api/v1/auth/password/change', [
            'current_password' => 'WrongPass1',
            'password' => 'NewSecure1',
            'password_confirmation' => 'NewSecure1',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertTrue(Hash::check('SecurePass1', $user->fresh()->password));
    }

    public function test_password_changes_only_after_email_code_and_code_cannot_be_reused(): void
    {
        Mail::fake();
        $user = $this->patient();
        Sanctum::actingAs($user);
        $start = $this->postJson('/api/v1/auth/password/change', [
            'current_password' => 'SecurePass1',
            'password' => 'NewSecure1',
            'password_confirmation' => 'NewSecure1',
        ])->assertOk();
        $challengeId = $start->json('data.challenge_id');
        $this->assertTrue(Hash::check('SecurePass1', $user->fresh()->password));

        $code = null;
        Mail::assertSent(PasswordChangeCodeMail::class, function (PasswordChangeCodeMail $mail) use (&$code, $user) {
            $code = $mail->code;
            return $mail->hasTo($user->email);
        });

        $this->postJson('/api/v1/auth/password/change/confirm', [
            'challenge_id' => $challengeId,
            'code' => '000000',
        ])->assertUnprocessable();
        $this->assertTrue(Hash::check('SecurePass1', $user->fresh()->password));

        $this->postJson('/api/v1/auth/password/change/confirm', [
            'challenge_id' => $challengeId,
            'code' => $code,
        ])->assertOk();
        $this->assertTrue(Hash::check('NewSecure1', $user->fresh()->password));

        $this->postJson('/api/v1/auth/password/change/confirm', [
            'challenge_id' => $challengeId,
            'code' => $code,
        ])->assertUnprocessable();
    }

    public function test_expired_code_is_rejected(): void
    {
        Mail::fake();
        $user = $this->patient();
        Sanctum::actingAs($user);
        $start = $this->postJson('/api/v1/auth/password/change', [
            'current_password' => 'SecurePass1',
            'password' => 'NewSecure1',
            'password_confirmation' => 'NewSecure1',
        ])->assertOk();
        Cache::flush();
        $this->postJson('/api/v1/auth/password/change/confirm', [
            'challenge_id' => $start->json('data.challenge_id'),
            'code' => '123456',
        ])->assertUnprocessable();
        $this->assertTrue(Hash::check('SecurePass1', $user->fresh()->password));
    }

    public function test_doctor_and_admin_use_the_same_password_change_endpoints(): void
    {
        Mail::fake();
        foreach ([UserRole::Doctor, UserRole::Laboratory, UserRole::Admin] as $role) {
            $user = User::factory()->create(['role' => $role, 'is_active' => true, 'password' => 'SecurePass1']);
            Sanctum::actingAs($user);
            $this->postJson('/api/v1/auth/password/change', [
                'current_password' => 'SecurePass1',
                'password' => 'NewSecure1',
                'password_confirmation' => 'NewSecure1',
            ])->assertOk()->assertJsonPath('data.masked_email', app(PasswordChangeService::class)->maskEmail($user->email));
        }
    }

    public function test_unauthenticated_users_cannot_start_a_password_change(): void
    {
        $this->postJson('/api/v1/auth/password/change', [
            'current_password' => 'SecurePass1',
            'password' => 'NewSecure1',
            'password_confirmation' => 'NewSecure1',
        ])->assertUnauthorized();
    }

    private function patient(): User
    {
        return User::factory()->create([
            'role' => UserRole::Patient,
            'is_active' => true,
            'password' => 'SecurePass1',
            'email' => 'raghad@example.test',
        ]);
    }
}
