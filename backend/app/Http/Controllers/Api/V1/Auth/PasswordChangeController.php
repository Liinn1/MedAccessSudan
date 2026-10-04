<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Services\PasswordChangeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

class PasswordChangeController extends Controller
{
    public function __construct(private readonly PasswordChangeService $changes) {}

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', 'max:255', Password::min(8)->letters()->numbers()],
        ]);

        try {
            $challenge = $this->changes->start(
                $request->user(),
                $data['current_password'],
                $data['password'],
            );
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'mail_failed') {
                return response()->json([
                    'message' => "We couldn't send the verification code. Please try again.",
                    'code' => 'MAIL_FAILED',
                ], 503);
            }
            throw $error;
        }

        return response()->json(['data' => $challenge]);
    }

    public function resend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => ['required', 'uuid'],
        ]);

        try {
            $challenge = $this->changes->resend($request->user(), $data['challenge_id']);
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'mail_failed') {
                return response()->json([
                    'message' => "We couldn't send the verification code. Please try again.",
                    'code' => 'MAIL_FAILED',
                ], 503);
            }
            throw $error;
        }

        return response()->json(['data' => $challenge]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => ['required', 'uuid'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $this->changes->confirm($request->user(), $data['challenge_id'], $data['code']);

        $user = $request->user()->fresh();
        if (config('session.driver') === 'database' && $request->hasSession()) {
            DB::table(config('session.table', 'sessions'))
                ->where('user_id', $user->id)
                ->where('id', '!=', $request->session()->getId())
                ->delete();
        }
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
