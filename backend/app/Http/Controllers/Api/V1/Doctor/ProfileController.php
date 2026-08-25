<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\UpdateDoctorProfileRequest;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    public function update(UpdateDoctorProfileRequest $request): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        $data = $request->validated();
        $language = $data['biography_language'] ?? null;
        $profile->update([
            ...$data,
            'bio_en' => $language === 'en' ? ($data['biography'] ?? null) : null,
            'bio_ar' => $language === 'ar' ? ($data['biography'] ?? null) : null,
        ]);

        return response()->json([
            'data' => ['profile' => $profile->fresh()->only(['id', 'clinic_name', 'biography', 'biography_language'])],
            'message' => 'Professional profile updated.',
        ]);
    }
}
