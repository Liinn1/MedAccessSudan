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
use App\Mail\PasswordResetCodeMail;
use RuntimeException;
use Throwable;

class PasswordResetService
{
    public const TTL_SECONDS = 600;

    public const RESEND_SECONDS = 45;

    public function start(string $email, string $ip): array
    {
        $normalized = Str::lower(trim($email));
        $this->assertStartRateLimit($normalized, $ip);

        $user = User::query()->where('email', $normalized)->first();
        $challengeId = (string) Str::uuid();
        $code = (string) random_int(100000, 999999);
        $payload = [
            'user_id' => $user?->id,
            'email' => $normalized,
            'code_hash' => Hash::make($user ? $code : Str::random(40)),
            'attempts' => 0,
        ];

        Cache::put($this->challengeKey($normalized, $challengeId), $payload, self::TTL_SECONDS);
        Cache::put($this->currentKey($normalized), $challengeId, self::TTL_SECONDS);

        if ($user) {
            try {
                Mail::to($user->email)->send(new PasswordResetCodeMail($user, $code, $this->maskEmail($user->email)));
            } catch (Throwable $error) {
                Cache::forget($this->challengeKey($normalized, $challengeId));
                Cache::forget($this->currentKey($normalized));
                throw new RuntimeException('mail_failed', 0, $error);
            }
        }

        RateLimiter::hit($this->startLimiterKey($normalized, $ip), 900);

        return $this->challengeResponse($normalized, $challengeId, self::RESEND_SECONDS);
    }

    public function resend(string $email, string $challengeId, string $ip): array
    {
        $normalized = Str::lower(trim($email));
        $limiter = $this->resendLimiterKey($normalized, $ip);
        if (RateLimiter::tooManyAttempts($limiter, 1)) {
            return $this->challengeResponse($normalized, $challengeId, RateLimiter::availableIn($limiter));
        }

        $payload = $this->payloadFor($normalized, $challengeId);
        $user = isset($payload['user_id']) ? User::query()->find($payload['user_id']) : null;
        $code = (string) random_int(100000, 999999);
        $payload['code_hash'] = Hash::make($user ? $code : Str::random(40));
        $payload['attempts'] = 0;

        Cache::put($this->challengeKey($normalized, $challengeId), $payload, self::TTL_SECONDS);
        Cache::put($this->currentKey($normalized), $challengeId, self::TTL_SECONDS);

        if ($user) {
            try {
                Mail::to($user->email)->send(new PasswordResetCodeMail($user, $code, $this->maskEmail($user->email)));
            } catch (Throwable $error) {
                throw new RuntimeException('mail_failed', 0, $error);
            }
        }

        RateLimiter::hit($limiter, self::RESEND_SECONDS);

        return $this->challengeResponse($normalized, $challengeId, self::RESEND_SECONDS);
    }

    public function reset(string $email, string $challengeId, string $code, string $password): void
    {
        $normalized = Str::lower(trim($email));
        $payload = $this->payloadFor($normalized, $challengeId);
        $payload['attempts'] = (int) $payload['attempts'] + 1;

        if ($payload['attempts'] > 5) {
            $this->forget($normalized, $challengeId);
            throw ValidationException::withMessages(['code' => 'This verification code is no longer valid.']);
        }

        Cache::put($this->challengeKey($normalized, $challengeId), $payload, self::TTL_SECONDS);

        if (! Hash::check($code, $payload['code_hash'])) {
            throw ValidationException::withMessages(['code' => 'The verification code is incorrect or has expired.']);
        }

        $user = isset($payload['user_id']) ? User::query()->find($payload['user_id']) : null;
        if (! $user || Str::lower($user->email) !== $normalized) {
            throw ValidationException::withMessages(['code' => 'The verification code is incorrect or has expired.']);
        }

        DB::table('users')->where('id', $user->id)->update([
            'password' => Hash::make($password),
            'remember_token' => Str::random(60),
            'updated_at' => now(),
        ]);

        $user->tokens()->delete();
        if (config('session.driver') === 'database') {
            DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
        }

        $this->forget($normalized, $challengeId);
    }

    public function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $keep = strlen($local) > 0 ? 1 : 0;

        return substr($local, 0, $keep).str_repeat('*', max(3, strlen($local) - $keep)).'@'.$domain;
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadFor(string $email, string $challengeId): array
    {
        $current = Cache::get($this->currentKey($email));
        $payload = Cache::get($this->challengeKey($email, $challengeId));

        if (! is_array($payload) || $current !== $challengeId || ($payload['email'] ?? null) !== $email) {
            throw ValidationException::withMessages(['code' => 'The verification code is incorrect or has expired.']);
        }

        return $payload;
    }

    private function forget(string $email, string $challengeId): void
    {
        Cache::forget($this->challengeKey($email, $challengeId));
        Cache::forget($this->currentKey($email));
    }

    /** @return array<string, mixed> */
    private function challengeResponse(string $email, string $challengeId, int $resendAfter): array
    {
        return [
            'challenge_id' => $challengeId,
            'masked_email' => $this->maskEmail($email),
            'expires_in' => self::TTL_SECONDS,
            'resend_after' => max(0, $resendAfter),
        ];
    }

    private function assertStartRateLimit(string $email, string $ip): void
    {
        $key = $this->startLimiterKey($email, $ip);
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'email' => 'Too many password reset attempts. Try again later.',
            ]);
        }
    }

    private function startLimiterKey(string $email, string $ip): string
    {
        return 'password-reset-start:'.hash('sha256', $email.'|'.$ip);
    }

    private function resendLimiterKey(string $email, string $ip): string
    {
        return 'password-reset-resend:'.hash('sha256', $email.'|'.$ip);
    }

    private function challengeKey(string $email, string $challengeId): string
    {
        return 'password-reset:'.hash('sha256', $email).':'.$challengeId;
    }

    private function currentKey(string $email): string
    {
        return 'password-reset-current:'.hash('sha256', $email);
    }
}
