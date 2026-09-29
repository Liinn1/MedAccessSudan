<?php

namespace App\Models\Concerns;

use App\Enums\DoctorVerificationStatus;
use App\Models\ProviderVerification;
use Illuminate\Database\Eloquent\Relations\MorphOne;

trait HasProfessionalVerification
{
    public function providerVerification(): MorphOne
    {
        return $this->morphOne(ProviderVerification::class, 'verifiable');
    }

    public function isProfessionallyVerified(): bool
    {
        return $this->verification_status === DoctorVerificationStatus::Verified->value;
    }
}
