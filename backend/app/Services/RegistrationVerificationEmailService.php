<?php

namespace App\Services;

use App\Models\User;
use Throwable;

class RegistrationVerificationEmailService
{
    public function send(User $user): bool
    {
        try {
            $user->sendEmailVerificationNotification();

            return true;
        } catch (Throwable $error) {
            report($error);

            return false;
        }
    }
}
