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
            ->has('reviews', '>=', $minimumReviews)
            ->with(['user:id,name', 'specialization', 'location'])
            ->withCount('reviews')->withAvg('reviews', 'rating')
            ->orderByDesc('reviews_avg_rating')->orderByDesc('reviews_count')->orderBy('id')
            ->limit(6)->get();

        return response()->json(['data' => $doctors->map(fn (DoctorProfile $doctor) => [
            'id' => $doctor->id,
            'name' => $doctor->user->name,
            'profile_image_url' => ProfilePhotoService::publicUrl($doctor->profile_image_path),
            'specialization' => $doctor->specialization->only(['code', 'name_en', 'name_ar']),
            'location' => $doctor->location->only(['code', 'name_en', 'name_ar']),
            'average_rating' => round((float) $doctor->reviews_avg_rating, 1),
            'review_count' => (int) $doctor->reviews_count,
            'verification_status' => $doctor->verification_status,
        ])->values()]);
    }
}
