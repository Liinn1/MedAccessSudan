<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\DoctorProfile;
use App\Services\AvailabilityResolver;
use App\Services\ProfilePhotoService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorDashboardController extends Controller
{
    public function __construct(private readonly AvailabilityResolver $availabilityResolver) {}

    public function __invoke(Request $request): JsonResponse
    {
        $profile = DoctorProfile::query()
            ->with(['specialization:id,code,name_en,name_ar', 'location:id,code,name_en,name_ar'])
            ->where('user_id', $request->user()->id)
            ->first();

        $availableSlotsCount = 0;

        if ($profile && DoctorProfile::query()->bookable()->whereKey($profile->id)->exists()) {
            $from = CarbonImmutable::today(config('app.timezone'));
            $availableSlotsCount = collect(
                $this->availabilityResolver->resolve($profile, $from, $from->addDays(13))
            )->sum(fn (array $date): int => count($date['slots']));
        }

        return response()->json([
            'data' => [
                'user' => new AuthenticatedUserResource($request->user()),
                'profile' => $profile ? [
                    'id' => $profile->id,
                    'clinic_name' => $profile->clinic_name,
                    'biography' => $profile->biography,
                    'biography_language' => $profile->biography_language,
                    'verification_status' => $profile->verification_status,
                    'profile_image_url' => ProfilePhotoService::publicUrl($profile->profile_image_path),
                    'specialization' => $profile->specialization?->only(['code', 'name_en', 'name_ar']),
                    'location' => $profile->location?->only(['code', 'name_en', 'name_ar']),
                    'available_slots_count' => $availableSlotsCount,
                    'has_weekly_availability' => $profile->schedules()->where('is_active', true)->exists(),
                ] : null,
            ],
        ]);
    }
}
