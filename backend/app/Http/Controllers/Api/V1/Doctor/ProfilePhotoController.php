<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfilePhotoRequest;
use App\Services\ProfilePhotoService;
use Illuminate\Http\JsonResponse;

class ProfilePhotoController extends Controller
{
    public function store(UpdateProfilePhotoRequest $request, ProfilePhotoService $photos): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        $photos->replace(
            $request->file('profile_photo'),
            'doctors',
            $profile->profile_image_path,
            fn (string $path) => $profile->update(['profile_image_path' => $path]),
        );

        return response()->json(['data' => ['profile_image_url' => ProfilePhotoService::publicUrl($profile->fresh()->profile_image_path)], 'message' => 'Profile picture updated.']);
    }
}
