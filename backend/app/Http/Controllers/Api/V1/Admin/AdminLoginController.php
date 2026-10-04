<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\AuthenticatedUserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AdminLoginController extends Controller
{
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $identifier = trim($request->string('identifier')->toString());
        $field = filter_var($identifier, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';
        $normalizedIdentifier = $field === 'email'
            ? Str::lower($identifier)
            : str_replace([' ', '-', '(', ')'], '', $identifier);
        $throttleKey = hash('sha256', 'admin|'.$normalizedIdentifier.'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return response()->json([
                'message' => 'Too many login attempts. Try again shortly.',
                'code' => 'TOO_MANY_ATTEMPTS',
            ], 429);
        }

        if (! Auth::guard('web')->attempt([
            $field => $normalizedIdentifier,
            'password' => $request->string('password')->toString(),
        ], $request->boolean('remember'))) {
            RateLimiter::hit($throttleKey, 60);

            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'code' => 'INVALID_CREDENTIALS',
            ], 422);
        }

        $user = Auth::guard('web')->user();

        if ($user?->is_active === false || ! $user?->role?->isAdministrative()) {
            Auth::guard('web')->logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
            RateLimiter::hit($throttleKey, 60);

            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'code' => 'INVALID_CREDENTIALS',
            ], 422);
        }

        RateLimiter::clear($throttleKey);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json([
            'data' => [
                'user' => new AuthenticatedUserResource($user),
            ],
            'message' => 'Login successful.',
        ]);
    }
}
