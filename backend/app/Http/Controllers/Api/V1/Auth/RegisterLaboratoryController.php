<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\DoctorVerificationStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterLaboratoryRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\Location;
use App\Models\User;
use App\Services\CityNameNormalizer;
use App\Services\ProfilePhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class RegisterLaboratoryController extends Controller
{
    public function __invoke(RegisterLaboratoryRequest $request, CityNameNormalizer $cityNames, ProfilePhotoService $photos): JsonResponse
    {
        $validated = $request->validated();
        $photoPath = $request->hasFile('profile_photo')
            ? $photos->store($request->file('profile_photo'), 'laboratories')
            : null;

        try {
            $user = DB::transaction(function () use ($validated, $cityNames, $photoPath): User {
                $name = $validated['laboratory_name'];
                $locationId = isset($validated['location'])
                    ? Location::where('code', $validated['location'])->valueOrFail('id')
                    : null;
                $initialStatus = config('medaccess.demo_auto_verify_doctors') && $locationId
                    ? DoctorVerificationStatus::Verified
                    : DoctorVerificationStatus::Pending;

                $user = User::create([
                    'name' => $name,
                    'first_name' => $name,
                    'last_name' => null,
                    'email' => $validated['email'],
                    'phone' => $validated['phone'],
                    'profile_image_path' => $photoPath,
                    'role' => UserRole::Laboratory,
                    'password' => $validated['password'],
                ]);

                $user->laboratoryProfile()->create([
                    'name' => $name,
                    'location_id' => $locationId,
                    'address' => $validated['address'],
                    'proposed_city' => isset($validated['proposed_city'])
                        ? $cityNames->display($validated['proposed_city'])
                        : null,
                    'profile_image_path' => $photoPath,
                    'verification_status' => $initialStatus->value,
                ]);

                return $user;
            });
        } catch (Throwable $error) {
            $photos->discard($photoPath);
            throw $error;
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'data' => ['user' => new AuthenticatedUserResource($user)],
            'message' => 'Laboratory application submitted successfully. Verify your email to sign in.',
        ], 201);
    }
}
