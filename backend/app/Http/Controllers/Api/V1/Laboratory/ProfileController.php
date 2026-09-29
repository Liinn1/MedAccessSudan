<?php

namespace App\Http\Controllers\Api\V1\Laboratory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Laboratory\UpdateLaboratoryProfileRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\Location;
use App\Services\ProfilePhotoService;
use App\Support\LaboratoryAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $profile = LaboratoryAccess::profile($request->user());
        $profile->load('location:id,code,name_en,name_ar');

        return response()->json(['data' => $this->payload($request, $profile)]);
    }

    public function update(UpdateLaboratoryProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $profile = LaboratoryAccess::profile($user);
        $data = $request->validated();
        $locationId = ! empty($data['location'])
            ? Location::query()->where('code', $data['location'])->valueOrFail('id')
            : $profile->location_id;

        DB::transaction(function () use ($user, $profile, $data, $locationId): void {
            $user->update([
                'name' => $data['name'],
                'first_name' => $data['name'],
                'phone' => $data['phone'],
            ]);
            $profile->update([
                'name' => $data['name'],
                'address' => $data['address'],
                'location_id' => $locationId,
            ]);
        });

        $profile->refresh()->load('location:id,code,name_en,name_ar');

        return response()->json([
            'data' => $this->payload($request, $profile),
            'message' => 'Laboratory profile updated.',
        ]);
    }

    /** @return array<string, mixed> */
    private function payload(Request $request, $profile): array
    {
        return [
            'user' => new AuthenticatedUserResource($request->user()->fresh()),
            'profile' => [
                'id' => $profile->id,
                'name' => $profile->name,
                'address' => $profile->address,
                'verification_status' => $profile->verification_status,
                'profile_image_url' => ProfilePhotoService::publicUrl($profile->profile_image_path ?? $request->user()->profile_image_path),
                'location' => $profile->location?->only(['code', 'name_en', 'name_ar']),
                'phone' => $request->user()->fresh()->phone,
            ],
        ];
    }
}
