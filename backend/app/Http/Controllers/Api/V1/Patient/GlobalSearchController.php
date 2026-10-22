<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use App\Models\DoctorProfile;
use App\Models\LaboratoryProfile;
use App\Models\LabTest;
use App\Models\Specialization;
use App\Services\ProfilePhotoService;
use App\Support\LabTestQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate(['q' => ['required', 'string', 'min:2', 'max:80']]);
        $search = trim($validated['q']);
        $like = '%'.addcslashes($search, '%_\\').'%';

        $doctors = DoctorProfile::query()
            ->with(['user:id,name', 'specialization:id,code,name_en,name_ar', 'location:id,code,name_en,name_ar'])
            ->visibleToPatients()
            ->where(function (Builder $query) use ($like): void {
                $query->whereHas('user', fn (Builder $user) => $user->where('name', 'like', $like))
                    ->orWhereHas('specialization', fn (Builder $specialty) => $specialty->where('name_en', 'like', $like)->orWhere('name_ar', 'like', $like))
                    ->orWhereHas('location', fn (Builder $location) => $location->where('name_en', 'like', $like)->orWhere('name_ar', 'like', $like));
            })
            ->limit(5)
            ->get()
            ->map(fn (DoctorProfile $profile) => [
                'id' => $profile->id,
                'name' => $profile->user->name,
                'profile_image_url' => ProfilePhotoService::publicUrl($profile->profile_image_path),
                'specialization' => $profile->specialization->only(['code', 'name_en', 'name_ar']),
                'location' => $profile->location?->only(['code', 'name_en', 'name_ar']),
            ]);

        $specializations = Specialization::query()
            ->where('is_active', true)
            ->where(fn (Builder $query) => $query->where('name_en', 'like', $like)->orWhere('name_ar', 'like', $like))
            ->whereHas('doctorProfiles', fn (Builder $doctor) => $doctor->visibleToPatients())
            ->limit(5)
            ->get(['id', 'code', 'name_en', 'name_ar']);

        $laboratories = LaboratoryProfile::query()
            ->with('location:id,code,name_en,name_ar')
            ->visibleToPatients()
            ->whereHas('offerings', fn (Builder $offering) => $offering->where('is_available', true))
            ->where(fn (Builder $query) => $query->where('name', 'like', $like)
                ->orWhereHas('location', fn (Builder $location) => $location->where('name_en', 'like', $like)->orWhere('name_ar', 'like', $like)))
            ->limit(5)
            ->get(['id', 'name', 'location_id', 'supports_at_lab', 'supports_home_collection'])
            ->map(fn (LaboratoryProfile $profile) => [
                'id' => $profile->id,
                'name' => $profile->name,
                'location' => $profile->location?->only(['code', 'name_en', 'name_ar']),
                'supports_at_lab' => $profile->supports_at_lab,
                'supports_home_collection' => $profile->supports_home_collection,
            ]);

        $tests = LabTest::query()
            ->with('category:id,slug,name_en,name_ar')
            ->where('is_active', true)
            ->whereHas('offerings', fn (Builder $offering) => $offering->where('is_available', true)
                ->whereHas('laboratoryProfile', fn (Builder $laboratory) => $laboratory->visibleToPatients()))
            ->where(fn (Builder $query) => LabTestQuery::matchesSearch($query, $search))
            ->limit(5)
            ->get(['id', 'lab_test_category_id', 'name_en', 'name_ar', 'short_name']);

        return response()->json(['data' => compact('doctors', 'specializations', 'laboratories', 'tests')]);
    }
}
