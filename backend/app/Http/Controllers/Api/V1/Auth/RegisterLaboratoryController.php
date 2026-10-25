<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\DoctorVerificationStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterLaboratoryRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\Location;
use App\Models\User;
use App\Services\ProfilePhotoService;
use App\Services\ProviderVerificationService;
use App\Services\RegistrationVerificationEmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class RegisterLaboratoryController extends Controller
{
    public function __invoke(RegisterLaboratoryRequest $request, ProfilePhotoService $photos, ProviderVerificationService $verifications, RegistrationVerificationEmailService $verificationEmail): JsonResponse
    {
        $validated = $request->validated();
        $photoPath = $request->hasFile('profile_photo')
            ? $photos->store($request->file('profile_photo'), 'laboratories')
            : null;

        try {
            $user = DB::transaction(function () use ($validated, $photoPath, $verifications): User {
                $name = $validated['laboratory_name'];
                $locationId = isset($validated['location'])
                    ? Location::where('code', $validated['location'])->valueOrFail('id')
                    : null;

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

                $profile = $user->laboratoryProfile()->create([
                    'name' => $name,
                    'location_id' => $locationId,
                    'address' => $validated['address'],
                    'profile_image_path' => $photoPath,
                    'supports_at_lab' => $validated['supports_at_lab'],
                    'supports_home_collection' => $validated['supports_home_collection'],
                    'verification_status' => DoctorVerificationStatus::PendingDocuments->value,
                ]);
                $verifications->ensure($profile);

                return $user;
            });
        } catch (Throwable $error) {
            $photos->discard($photoPath);
            throw $error;
        }

        $verificationEmailSent = $verificationEmail->send($user);

        return response()->json([
            'data' => ['user' => new AuthenticatedUserResource($user)],
            'account_created' => true,
            'verification_email_sent' => $verificationEmailSent,
            ...($verificationEmailSent ? [] : ['code' => 'ACCOUNT_CREATED_BUT_VERIFICATION_EMAIL_FAILED']),
            'message' => $verificationEmailSent
                ? 'Laboratory application submitted successfully. Verify your email to sign in.'
                : 'Laboratory application submitted successfully, but the verification email could not be sent.',
        ], 201);
    }
}
