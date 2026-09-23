<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $expectedRoles = array_filter(array_map(UserRole::tryFrom(...), $roles));
        $user = $request->user();

        if (! $user || $user->is_active === false || ! in_array($user->role, $expectedRoles, true)) {
            return new JsonResponse([
                'message' => 'You are not authorized to access this resource.',
                'code' => 'FORBIDDEN_ROLE',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
