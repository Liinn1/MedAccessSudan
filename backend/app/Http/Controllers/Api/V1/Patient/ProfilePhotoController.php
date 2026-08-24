<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfilePhotoRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Services\ProfilePhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfilePhotoController extends Controller
{
    public function store(UpdateProfilePhotoRequest $request, ProfilePhotoService $photos): JsonResponse
    {
        $user = $request->user();
        $photos->replace(
            $request->file('profile_photo'),
            'patients',
            $user->profile_image_path,
            fn (string $path) => $user->update(['profile_image_path' => $path]),
        );

        return response()->json(['data' => ['user' => new AuthenticatedUserResource($user->fresh())], 'message' => 'Profile picture updated.']);
    }

    public function destroy(Request $request, ProfilePhotoService $photos): JsonResponse
    {
        $user = $request->user();
        $photos->remove($user->profile_image_path, fn () => $user->update(['profile_image_path' => null]));

        return response()->json(['data' => ['user' => new AuthenticatedUserResource($user->fresh())], 'message' => 'Profile picture removed.']);
    }
}
