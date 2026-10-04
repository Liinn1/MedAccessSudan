<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Services\PasswordResetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

class PasswordResetController extends Controller
{
    public function __construct(private readonly PasswordResetService $resets) {}

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        try {
            $challenge = $this->resets->start($data['email'], (string) $request->ip());
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'mail_failed') {
                return response()->json([
                    'message' => "We couldn't send the verification code. Please try again.",
                    'code' => 'MAIL_FAILED',
                ], 503);
            }
            throw $error;
        }

        return response()->json([
            'data' => $challenge,
            'message' => 'If an account exists for this email, we\'ve sent password reset instructions.',
        ]);
    }

    public function resend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'challenge_id' => ['required', 'uuid'],
        ]);

        try {
            $challenge = $this->resets->resend($data['email'], $data['challenge_id'], (string) $request->ip());
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'mail_failed') {
                return response()->json([
                    'message' => "We couldn't send the verification code. Please try again.",
                    'code' => 'MAIL_FAILED',
                ], 503);
            }
            throw $error;
        }

        return response()->json([
            'data' => $challenge,
            'message' => 'If an account exists for this email, we\'ve sent password reset instructions.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'challenge_id' => ['required', 'uuid'],
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'confirmed', 'max:255', Password::min(8)->letters()->numbers()],
        ]);

        $this->resets->reset($data['email'], $data['challenge_id'], $data['code'], $data['password']);

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
