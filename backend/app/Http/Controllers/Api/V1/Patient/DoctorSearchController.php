<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Enums\AppointmentServiceType;
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
        $serviceType = AppointmentServiceType::tryFrom($validated['service_type'] ?? '') ?? AppointmentServiceType::Clinic;
        $to = $availability === 'today' ? $from->endOfDay() : $from->addDays(6)->endOfDay();
        $query = DoctorProfile::query()
            ->with(['user:id,name', 'specialization:id,code,name_en,name_ar', 'location:id,code,name_en,name_ar', 'homeVisitLocation:id,code,name_en,name_ar'])
            ->visibleToPatients()
            ->where($serviceType === AppointmentServiceType::HomeVisit ? 'offers_home_visits' : 'offers_clinic_visits', true)
            ->when($validated['specialization'] ?? null, fn (Builder $doctorQuery, string $code) => $doctorQuery
                ->whereHas('specialization', fn (Builder $specialization) => $specialization->where('code', $code)))
            ->when($validated['location'] ?? null, function (Builder $doctorQuery, string $code) use ($serviceType): void {
                $relation = $serviceType === AppointmentServiceType::HomeVisit ? 'homeVisitLocation' : 'location';
                $doctorQuery->whereHas($relation, fn (Builder $location) => $location->where('code', $code));
            });

        $doctors = $query->get()
            ->map(function (DoctorProfile $profile) use ($availability, $resolver, $from, $to, $serviceType) {
                $first = collect($resolver->resolve($profile, $from, $to, $serviceType))->flatMap(fn ($day) => $day['slots'])->first();
                if (($availability || $serviceType === AppointmentServiceType::HomeVisit) && ! $first) {
                    return null;
                }

                return [
                    'id' => $profile->id,
                    'name' => $profile->user->name,
                    'clinic_name' => $profile->clinic_name,
                    'profile_image_url' => ProfilePhotoService::publicUrl($profile->profile_image_path),
                    'specialization' => $profile->specialization->only(['code', 'name_en', 'name_ar']),
                    'location' => $profile->location?->only(['code', 'name_en', 'name_ar']),
                    'home_visit_location' => $profile->homeVisitLocation?->only(['code', 'name_en', 'name_ar']),
                    'next_available_at' => $first['starts_at'] ?? null,
                ];
            })->filter()->sortBy(fn (array $doctor) => $doctor['next_available_at'] ?? '9999-12-31')->values();

        return response()->json([
            'data' => ['doctors' => $doctors],
            'meta' => ['total' => $doctors->count(), 'filters' => $validated],
        ]);
    }
}
