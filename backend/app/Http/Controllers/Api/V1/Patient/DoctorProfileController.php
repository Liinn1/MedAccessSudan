<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use App\Http\Resources\DoctorProfileResource;
use App\Models\DoctorProfile;
use App\Services\AvailabilityResolver;
use Carbon\CarbonImmutable;

class DoctorProfileController extends Controller
{
    public function __invoke(int $doctor, AvailabilityResolver $resolver): DoctorProfileResource
    {
        $profile = DoctorProfile::query()
            ->with([
                'user:id,name',
                'specialization:id,code,name_en,name_ar',
                'location:id,code,name_en,name_ar',
            ])
            ->whereKey($doctor)
            ->bookable()
            ->firstOrFail();

        $from = CarbonImmutable::now(config('app.timezone'))->startOfDay();
        $profile->setAttribute('resolved_availability', collect($resolver->resolve($profile, $from, $from->addDays(13)))->flatMap(fn ($day) => $day['slots'])->take(24)->values());

        return new DoctorProfileResource($profile);
    }
}
