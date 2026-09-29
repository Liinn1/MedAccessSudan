<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ResendEmailVerificationController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
        ]);

        $email = Str::lower(trim($validated['email']));
        $user = User::query()->where('email', $email)->first();

        if ($user && ! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        // Same response whether or not the address exists, to avoid account enumeration.
        return response()->json([
            'message' => 'If an account needs verification, a new email was sent.',
        ]);
    }
}
