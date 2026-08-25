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
        $from = CarbonImmutable::now(config('app.timezone'));
        $availability = $validated['availability'] ?? null;
        $to = $availability === 'today' ? $from->endOfDay() : $from->addDays(6)->endOfDay();
        $query = DoctorProfile::query()
            ->with(['user:id,name', 'specialization:id,code,name_en,name_ar', 'location:id,code,name_en,name_ar'])
            ->visibleToPatients()
            ->when($validated['specialization'] ?? null, fn (Builder $doctorQuery, string $code) => $doctorQuery
                ->whereHas('specialization', fn (Builder $specialization) => $specialization->where('code', $code)))
            ->when($validated['location'] ?? null, fn (Builder $doctorQuery, string $code) => $doctorQuery
                ->whereHas('location', fn (Builder $location) => $location->where('code', $code)));

        $doctors = $query->get()
            ->map(function (DoctorProfile $profile) use ($availability, $resolver, $from, $to) {
                $first = collect($resolver->resolve($profile, $from, $to))->flatMap(fn ($day) => $day['slots'])->first();
                if ($availability && ! $first) {
                    return null;
                }

                return [
                    'id' => $profile->id,
                    'name' => $profile->user->name,
                    'clinic_name' => $profile->clinic_name,
                    'profile_image_url' => ProfilePhotoService::publicUrl($profile->profile_image_path),
                    'specialization' => $profile->specialization->only(['code', 'name_en', 'name_ar']),
                    'location' => $profile->location->only(['code', 'name_en', 'name_ar']),
                    'next_available_at' => $first['starts_at'] ?? null,
                ];
            })->filter()->sortBy(fn (array $doctor) => $doctor['next_available_at'] ?? '9999-12-31')->values();

        return response()->json([
            'data' => ['doctors' => $doctors],
            'meta' => ['total' => $doctors->count(), 'filters' => $validated],
        ]);
    }
}
