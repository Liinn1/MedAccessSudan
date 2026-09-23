<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AdminLoginController extends Controller
{
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $identifier = trim($request->string('identifier')->toString());
        $field = filter_var($identifier, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';
        $identifier = $field === 'email' ? Str::lower($identifier) : str_replace([' ', '-', '(', ')'], '', $identifier);
        $key = hash('sha256', 'admin|'.$identifier.'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Too many login attempts. Try again shortly.', 'code' => 'TOO_MANY_ATTEMPTS'], 429);
        }

        $user = User::query()->where($field, $identifier)->first();
        if (! $user || ! $user->role->isAdministrative() || ! $user->is_active || ! Hash::check($request->string('password')->toString(), $user->password)) {
            RateLimiter::hit($key, 60);
            return response()->json(['message' => 'The provided credentials are incorrect.', 'code' => 'INVALID_CREDENTIALS'], 422);
        }

        RateLimiter::clear($key);
        auth('web')->login($user);
        $request->session()->regenerate();

        return response()->json(['data' => ['user' => new AuthenticatedUserResource($user)], 'message' => 'Login successful.']);
    }
}
