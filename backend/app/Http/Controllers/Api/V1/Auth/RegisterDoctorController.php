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
use App\Services\CityNameNormalizer;
use App\Services\ProfilePhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class RegisterDoctorController extends Controller
{
    public function __invoke(RegisterDoctorRequest $request, CityNameNormalizer $cityNames, ProfilePhotoService $photos): JsonResponse
    {
        $validated = $request->validated();
        $photoPath = $photos->store($request->file('profile_photo'), 'doctors');

        try {
            $user = DB::transaction(function () use ($validated, $cityNames, $photoPath): User {
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
                $initialVerificationStatus = config('medaccess.demo_auto_verify_doctors') && $locationId
                    ? DoctorVerificationStatus::Verified
                    : DoctorVerificationStatus::Pending;

                $profile = $user->doctorProfile()->create([
                    'specialization_id' => Specialization::where('code', $validated['specialization'])->valueOrFail('id'),
                    'location_id' => $locationId,
                    'home_visit_location_id' => ($validated['offers_home_visits'] ?? false) ? $locationId : null,
                    'clinic_name' => $validated['clinic_name'] ?? null,
                    'offers_clinic_visits' => (bool) ($validated['offers_clinic_visits'] ?? true),
                    'offers_home_visits' => (bool) ($validated['offers_home_visits'] ?? false),
                    'profile_image_path' => $photoPath,
                    'verification_status' => $initialVerificationStatus->value,
                ]);

                if (! empty($validated['proposed_city'])) {
                    $profile->cityProposal()->create([
                        'proposed_name' => $cityNames->display($validated['proposed_city']),
                        'normalized_name' => $cityNames->comparison($validated['proposed_city']),
                        'status' => 'pending',
                    ]);
                }

                return $user;
            });
        } catch (Throwable $error) {
            $photos->discard($photoPath);
            throw $error;
        }

        return response()->json(['data' => ['user' => new AuthenticatedUserResource($user)], 'message' => 'Doctor application submitted successfully.'], 201);
    }
}
