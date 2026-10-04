<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DoctorProfile;
use App\Services\ProfilePhotoService;
use Illuminate\Http\JsonResponse;

class FeaturedDoctorController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $minimumReviews = max(1, (int) config('medaccess.featured_doctor_min_reviews', 3));

        $doctors = DoctorProfile::query()->visibleToPatients()
            ->topRated($minimumReviews)
            ->with(['user:id,name', 'specialization', 'location'])
            ->limit(6)->get();

        return response()->json(['data' => $doctors->map(fn (DoctorProfile $doctor) => [
            'id' => $doctor->id,
            'name' => $doctor->user->name,
            'profile_image_url' => ProfilePhotoService::publicUrl($doctor->profile_image_path),
            'specialization' => $doctor->specialization->only(['code', 'name_en', 'name_ar']),
            'location' => $doctor->location->only(['code', 'name_en', 'name_ar']),
            ...$doctor->ratingSummary(),
            'verification_status' => $doctor->verification_status,
        ])->values()]);
    }
}
