<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use App\Http\Requests\Patient\SearchDoctorsRequest;
use App\Models\DoctorProfile;
use App\Services\AvailabilityResolver;
use App\Services\ProfilePhotoService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class DoctorSearchController extends Controller
{
    public function __invoke(SearchDoctorsRequest $request, AvailabilityResolver $resolver): JsonResponse
    {
        $validated = $request->validated();
        $rangeEnd = $validated['availability'] === 'today' ? now()->endOfDay() : now()->endOfWeek();

        $from = CarbonImmutable::now(config('app.timezone'));
        $to = CarbonImmutable::instance($rangeEnd);
        $doctors = DoctorProfile::query()
            ->with(['user:id,name', 'specialization:id,code,name_en,name_ar', 'location:id,code,name_en,name_ar'])
            ->bookable()
            ->whereHas('specialization', fn (Builder $query) => $query->where('code', $validated['specialization']))
            ->whereHas('location', fn (Builder $query) => $query->where('code', $validated['location']))
            ->get()
            ->map(function (DoctorProfile $profile) use ($resolver, $from, $to) {
                $first = collect($resolver->resolve($profile, $from, $to))->flatMap(fn ($day) => $day['slots'])->first();
                if (! $first) {
                    return null;
                }

                return [
                    'id' => $profile->id,
                    'name' => $profile->user->name,
                    'clinic_name' => $profile->clinic_name,
                    'profile_image_url' => ProfilePhotoService::publicUrl($profile->profile_image_path),
                    'specialization' => $profile->specialization->only(['code', 'name_en', 'name_ar']),
                    'location' => $profile->location->only(['code', 'name_en', 'name_ar']),
                    'next_available_at' => $first['starts_at'],
                ];
            })->filter()->sortBy('next_available_at')->values();

        return response()->json([
            'data' => ['doctors' => $doctors],
            'meta' => ['total' => $doctors->count(), 'filters' => $validated],
        ]);
    }
}
