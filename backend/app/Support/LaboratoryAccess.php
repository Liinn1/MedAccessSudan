<?php

namespace App\Support;

use App\Models\LaboratoryProfile;
use App\Models\User;
use App\Support\ProviderAccess;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;

class LaboratoryAccess
{
    public static function profile(User $user): LaboratoryProfile
    {
        $profile = $user->laboratoryProfile;
        if (! $profile) {
            throw new HttpResponseException(new JsonResponse([
                'message' => 'You are not authorized to access this resource.',
                'code' => 'FORBIDDEN_ROLE',
            ], 403));
        }

        return $profile;
    }

    public static function verifiedProfile(User $user): LaboratoryProfile
    {
        $profile = self::profile($user);
        ProviderAccess::assertVerified($profile);

        return $profile;
    }
}
