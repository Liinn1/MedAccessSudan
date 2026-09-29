<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    public function __invoke(Request $request, int $id, string $hash): RedirectResponse
    {
        $frontend = rtrim((string) config('medaccess.frontend_url'), '/');

        // Validate the signed URL here (instead of aborting 403) so the SPA can
        // show an expired/invalid message instead of a Laravel error page.
        if (! $request->hasValidSignature()) {
            return redirect()->away($frontend.'/verify-email?status=invalid');
        }

        $user = User::query()->find($id);

        if ($user === null || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return redirect()->away($frontend.'/verify-email?status=invalid');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect()->away($frontend.'/verify-email?status=already');
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        return redirect()->away($frontend.'/verify-email?status=success');
    }
}
