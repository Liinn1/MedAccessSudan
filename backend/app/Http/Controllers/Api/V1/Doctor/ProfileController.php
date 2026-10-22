<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\UpdateDoctorProfileRequest;
use App\Models\Location;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    public function update(UpdateDoctorProfileRequest $request): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        $data = $request->validated();
        $data['location_id'] = Location::query()->where('code', $data['location'])->valueOrFail('id');
        unset($data['location']);
        $language = $data['biography_language'] ?? null;
        if ($data['offers_home_visits'] ?? false) {
            $data['home_visit_location_id'] = $data['location_id'];
        }
        $profile->update([
            ...$data,
            'bio_en' => $language === 'en' ? ($data['biography'] ?? null) : null,
            'bio_ar' => $language === 'ar' ? ($data['biography'] ?? null) : null,
        ]);

        return response()->json([
            'data' => ['profile' => $profile->fresh()->only([
                'id',
                'clinic_name',
                'address',
                'location_id',
                'biography',
                'biography_language',
                'offers_clinic_visits',
                'offers_home_visits',
            ])],
            'message' => 'Professional profile updated.',
        ]);
    }
}
