<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuthenticatedUserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CurrentUserController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user?->is_active === false) {
            Auth::guard('web')->logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json([
                'message' => 'Your account has been suspended. Please contact MedAccess support for assistance.',
                'code' => 'ACCOUNT_SUSPENDED',
            ], 403);
        }

        return response()->json([
            'data' => [
                'user' => new AuthenticatedUserResource($user),
            ],
        ]);
    }
}
