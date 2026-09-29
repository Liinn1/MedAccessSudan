<?php

namespace App\Http\Controllers\Api\V1\Laboratory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfilePhotoRequest;
use App\Services\ProfilePhotoService;
use App\Support\LaboratoryAccess;
use Illuminate\Http\JsonResponse;

class ProfilePhotoController extends Controller
{
    public function store(UpdateProfilePhotoRequest $request, ProfilePhotoService $photos): JsonResponse
    {
        $user = $request->user();
        $profile = LaboratoryAccess::profile($user);
        $photos->replace(
            $request->file('profile_photo'),
            'laboratories',
            $profile->profile_image_path,
            function (string $path) use ($profile, $user): void {
                $profile->update(['profile_image_path' => $path]);
                $user->update(['profile_image_path' => $path]);
            },
        );

        return response()->json([
            'data' => ['profile_image_url' => ProfilePhotoService::publicUrl($profile->fresh()->profile_image_path)],
            'message' => 'Profile picture updated.',
        ]);
    }
}
