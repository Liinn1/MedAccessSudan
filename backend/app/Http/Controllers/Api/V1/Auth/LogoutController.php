<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LogoutController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        // Invalidate the authenticated session and rotate the CSRF token so a
        // captured pre-logout session identifier cannot be reused.
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }
}
