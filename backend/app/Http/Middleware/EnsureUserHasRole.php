<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $expectedRoles = array_filter(array_map(UserRole::tryFrom(...), $roles));
        $user = $request->user();

        if (! $user || ! in_array($user->role, $expectedRoles, true)) {
            return new JsonResponse([
                'message' => 'You are not authorized to access this resource.',
                'code' => 'FORBIDDEN_ROLE',
            ], Response::HTTP_FORBIDDEN);
        }

        if ($user->is_active === false) {
            Auth::guard('web')->logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return new JsonResponse([
                'message' => 'Your account has been suspended. Please contact MedAccess support for assistance.',
                'code' => 'ACCOUNT_SUSPENDED',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
