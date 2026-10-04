<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use App\Mail\PasswordChangeCodeMail;
use Throwable;

class PasswordChangeService
{
    public const TTL_SECONDS = 600;

    public const RESEND_SECONDS = 45;

    public function start(User $user, string $currentPassword, string $newPassword): array
    {
        $this->assertStartRateLimit($user);

        if (! Hash::check($currentPassword, $user->getAuthPassword())) {
            throw ValidationException::withMessages([
                'current_password' => 'Current password is incorrect.',
            ]);
        }

        $challengeId = (string) Str::uuid();
        $code = (string) random_int(100000, 999999);
        $payload = [
            'user_id' => $user->id,
            'code_hash' => Hash::make($code),
            'password_hash' => Hash::make($newPassword),
            'attempts' => 0,
        ];

        Cache::put($this->challengeKey($user->id, $challengeId), $payload, self::TTL_SECONDS);
        Cache::put($this->currentKey($user->id), $challengeId, self::TTL_SECONDS);

        try {
            Mail::to($user->email)->send(new PasswordChangeCodeMail($user, $code, $this->maskEmail($user->email)));
        } catch (Throwable $error) {
            Cache::forget($this->challengeKey($user->id, $challengeId));
            Cache::forget($this->currentKey($user->id));
            throw new RuntimeException('mail_failed', 0, $error);
        }

        RateLimiter::hit($this->startLimiterKey($user), 900);

        return $this->challengeResponse($user, $challengeId, self::RESEND_SECONDS);
    }

    public function resend(User $user, string $challengeId): array
    {
        $limiter = $this->resendLimiterKey($user);
        if (RateLimiter::tooManyAttempts($limiter, 1)) {
            return $this->challengeResponse($user, $challengeId, RateLimiter::availableIn($limiter));
        }

        $payload = $this->payloadFor($user, $challengeId);
        $code = (string) random_int(100000, 999999);
        $payload['code_hash'] = Hash::make($code);
        $payload['attempts'] = 0;

        Cache::put($this->challengeKey($user->id, $challengeId), $payload, self::TTL_SECONDS);
        Cache::put($this->currentKey($user->id), $challengeId, self::TTL_SECONDS);

        try {
            Mail::to($user->email)->send(new PasswordChangeCodeMail($user, $code, $this->maskEmail($user->email)));
        } catch (Throwable $error) {
            throw new RuntimeException('mail_failed', 0, $error);
        }

        RateLimiter::hit($limiter, self::RESEND_SECONDS);

        return $this->challengeResponse($user, $challengeId, self::RESEND_SECONDS);
    }

    public function confirm(User $user, string $challengeId, string $code): void
    {
        $payload = $this->payloadFor($user, $challengeId);
        $payload['attempts'] = (int) $payload['attempts'] + 1;

        if ($payload['attempts'] > 5) {
            $this->forget($user, $challengeId);
            throw ValidationException::withMessages(['code' => 'This verification code is no longer valid.']);
        }

        Cache::put($this->challengeKey($user->id, $challengeId), $payload, self::TTL_SECONDS);

        if (! Hash::check($code, $payload['code_hash'])) {
            throw ValidationException::withMessages(['code' => 'The verification code is incorrect.']);
        }

        DB::table('users')->where('id', $user->id)->update([
            'password' => $payload['password_hash'],
            'remember_token' => Str::random(60),
            'updated_at' => now(),
        ]);

        $user->tokens()->delete();
        $this->forget($user, $challengeId);
    }

    public function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $keep = strlen($local) > 0 ? 1 : 0;

        return substr($local, 0, $keep).str_repeat('*', max(3, strlen($local) - $keep)).'@'.$domain;
    }

    private function payloadFor(User $user, string $challengeId): array
    {
        $current = Cache::get($this->currentKey($user->id));
        $payload = Cache::get($this->challengeKey($user->id, $challengeId));

        if (! is_array($payload) || $current !== $challengeId || (int) ($payload['user_id'] ?? 0) !== $user->id) {
            throw ValidationException::withMessages(['code' => 'This verification code has expired.']);
        }

        return $payload;
    }

    private function forget(User $user, string $challengeId): void
    {
        Cache::forget($this->challengeKey($user->id, $challengeId));
        Cache::forget($this->currentKey($user->id));
    }

    private function challengeResponse(User $user, string $challengeId, int $resendAfter): array
    {
        return [
            'challenge_id' => $challengeId,
            'masked_email' => $this->maskEmail($user->email),
            'expires_in' => self::TTL_SECONDS,
            'resend_after' => max(0, $resendAfter),
        ];
    }

    private function assertStartRateLimit(User $user): void
    {
        $key = $this->startLimiterKey($user);
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'current_password' => 'Too many password change attempts. Try again later.',
            ]);
        }
    }

    private function startLimiterKey(User $user): string
    {
        return 'password-change-start:'.$user->id;
    }

    private function resendLimiterKey(User $user): string
    {
        return 'password-change-resend:'.$user->id;
    }

    private function challengeKey(int $userId, string $challengeId): string
    {
        return "password-change:{$userId}:{$challengeId}";
    }

    private function currentKey(int $userId): string
    {
        return "password-change-current:{$userId}";
    }
}
