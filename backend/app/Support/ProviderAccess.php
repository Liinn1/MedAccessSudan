<?php

namespace App\Support;

use App\Models\DoctorProfile;
use App\Models\LaboratoryProfile;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;

class ProviderAccess
{
    public static function assertVerified(DoctorProfile|LaboratoryProfile $profile): void
    {
        if ($profile->isProfessionallyVerified()) {
            return;
        }

        throw new HttpResponseException(new JsonResponse([
            'message' => 'Professional verification is required before you can use this feature.',
            'code' => 'PROVIDER_UNVERIFIED',
        ], 403));
    }
}
