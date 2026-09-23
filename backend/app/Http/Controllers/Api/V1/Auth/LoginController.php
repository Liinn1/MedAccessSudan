<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\AuthenticatedUserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class LoginController extends Controller
{
    private const MAX_ATTEMPTS = 5;

    private const DECAY_SECONDS = 60;

    public function __invoke(LoginRequest $request): JsonResponse
    {
        $identifier = trim($request->string('identifier')->toString());
        $field = filter_var($identifier, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';
        $normalizedIdentifier = $field === 'email'
            ? Str::lower($identifier)
            : $this->normalizePhone($identifier);
        $throttleKey = hash('sha256', $normalizedIdentifier.'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_ATTEMPTS)) {
            return response()->json([
                'message' => 'Too many login attempts. Try again shortly.',
                'code' => 'TOO_MANY_ATTEMPTS',
                'retry_after' => RateLimiter::availableIn($throttleKey),
            ], 429);
        }

        if (! Auth::guard('web')->attempt([
            $field => $normalizedIdentifier,
            'password' => $request->string('password')->toString(),
        ])) {
            RateLimiter::hit($throttleKey, self::DECAY_SECONDS);

            // Use one response for unknown accounts and wrong passwords to avoid
            // revealing whether a patient identity exists in the database.
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'code' => 'INVALID_CREDENTIALS',
            ], 422);
        }

        $user = Auth::guard('web')->user();

        // /login is for patient and doctor accounts only. Administrators use /admin/login.
        // Inactive accounts are rejected with the same generic error as bad passwords.
        if ($user?->is_active === false || $user?->role?->isAdministrative()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            RateLimiter::hit($throttleKey, self::DECAY_SECONDS);

            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'code' => 'INVALID_CREDENTIALS',
            ], 422);
        }

        RateLimiter::clear($throttleKey);
        $request->session()->regenerate();

        return response()->json([
            'data' => [
                'user' => new AuthenticatedUserResource($user),
            ],
            'message' => 'Login successful.',
        ]);
    }

    private function normalizePhone(string $phone): string
    {
        return str_replace([' ', '-', '(', ')'], '', $phone);
    }
}
