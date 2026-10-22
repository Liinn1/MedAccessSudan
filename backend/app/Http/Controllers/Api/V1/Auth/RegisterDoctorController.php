<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\DoctorVerificationStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterDoctorRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use App\Services\ProfilePhotoService;
use App\Services\ProviderVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class RegisterDoctorController extends Controller
{
    public function __invoke(RegisterDoctorRequest $request, ProfilePhotoService $photos, ProviderVerificationService $verifications): JsonResponse
    {
        $validated = $request->validated();
        $photoPath = $photos->store($request->file('profile_photo'), 'doctors');

        try {
            $user = DB::transaction(function () use ($validated, $photoPath, $verifications): User {
                $user = User::create([
                    'name' => $validated['first_name'].' '.$validated['last_name'],
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'email' => $validated['email'],
                    'phone' => $validated['phone'],
                    'role' => UserRole::Doctor,
                    'password' => $validated['password'],
                ]);
                $locationId = isset($validated['location'])
                    ? Location::where('code', $validated['location'])->valueOrFail('id')
                    : null;

                $profile = $user->doctorProfile()->create([
                    'specialization_id' => Specialization::where('code', $validated['specialization'])->valueOrFail('id'),
                    'location_id' => $locationId,
                    'home_visit_location_id' => ($validated['offers_home_visits'] ?? false) ? $locationId : null,
                    'clinic_name' => $validated['clinic_name'] ?? null,
                    'address' => $validated['address'],
                    'offers_clinic_visits' => (bool) ($validated['offers_clinic_visits'] ?? true),
                    'offers_home_visits' => (bool) ($validated['offers_home_visits'] ?? false),
                    'profile_image_path' => $photoPath,
                    'verification_status' => DoctorVerificationStatus::PendingDocuments->value,
                ]);

                $verifications->ensure($profile);

                return $user;
            });
        } catch (Throwable $error) {
            $photos->discard($photoPath);
            throw $error;
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['data' => ['user' => new AuthenticatedUserResource($user)], 'message' => 'Doctor application submitted successfully. Verify your email to sign in.'], 201);
    }
}
