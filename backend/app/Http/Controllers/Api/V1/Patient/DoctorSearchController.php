<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Patient\SearchDoctorsRequest;
use App\Models\DoctorProfile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class DoctorSearchController extends Controller
{
    public function __invoke(SearchDoctorsRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $rangeEnd = $validated['availability'] === 'today' ? now()->endOfDay() : now()->endOfWeek();

        $doctors = DoctorProfile::query()
            ->with(['user:id,name', 'specialization:id,code,name_en,name_ar', 'location:id,code,name_en,name_ar'])
            ->where('verification_status', 'verified')
            ->whereHas('user', fn (Builder $query) => $query->where('role', UserRole::Doctor->value))
            ->whereHas('specialization', fn (Builder $query) => $query->where('code', $validated['specialization']))
            ->whereHas('location', fn (Builder $query) => $query->where('code', $validated['location']))
            ->whereHas('availability', fn (Builder $query) => $query
                ->where('status', 'available')
                ->whereBetween('starts_at', [now(), $rangeEnd]))
            ->withMin(['availability as next_available_at' => fn (Builder $query) => $query
                ->where('status', 'available')
                ->whereBetween('starts_at', [now(), $rangeEnd])], 'starts_at')
            ->orderBy('next_available_at')
            ->get()
            ->map(fn (DoctorProfile $profile) => [
                'id' => $profile->id,
                'name' => $profile->user->name,
                'clinic_name' => $profile->clinic_name,
                'specialization' => $profile->specialization->only(['code', 'name_en', 'name_ar']),
                'location' => $profile->location->only(['code', 'name_en', 'name_ar']),
                'next_available_at' => $profile->next_available_at,
            ]);

        return response()->json([
            'data' => ['doctors' => $doctors],
            'meta' => ['total' => $doctors->count(), 'filters' => $validated],
        ]);
    }
}
