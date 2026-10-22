<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;

class LogoutController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $bearerToken = $request->bearerToken();
        if ($bearerToken !== null) {
            $token = PersonalAccessToken::findToken($bearerToken);
            if ($token && $token->tokenable_id === $request->user()?->getKey()) {
                $token->delete();
            }

            return response()->json([
                'message' => 'Logout successful.',
            ]);
        }

        Auth::guard('web')->logout();

        // Invalidate the authenticated session and rotate the CSRF token so a
        // captured pre-logout session identifier cannot be reused.
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }
}
