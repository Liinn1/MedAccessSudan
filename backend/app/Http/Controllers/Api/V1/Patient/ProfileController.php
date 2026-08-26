<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use App\Http\Requests\Patient\UpdatePatientProfileRequest;
use App\Http\Resources\AuthenticatedUserResource;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    public function update(UpdatePatientProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $attributes = $request->validated();
        $attributes['name'] = "{$attributes['first_name']} {$attributes['last_name']}";
        $user->update($attributes);

        return response()->json([
            'data' => ['user' => new AuthenticatedUserResource($user->fresh())],
            'message' => 'Patient profile updated.',
        ]);
    }
}
