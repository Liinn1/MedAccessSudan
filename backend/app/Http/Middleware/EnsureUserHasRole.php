<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $expectedRole = UserRole::tryFrom($role);

        if ($expectedRole === null || $request->user()?->role !== $expectedRole) {
            return new JsonResponse([
                'message' => 'You are not authorized to access this resource.',
                'code' => 'FORBIDDEN_ROLE',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
