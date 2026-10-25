<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterPatientRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\User;
use App\Services\ProfilePhotoService;
use App\Services\RegistrationVerificationEmailService;
use Illuminate\Http\JsonResponse;
use Throwable;

class RegisterPatientController extends Controller
{
    public function __invoke(RegisterPatientRequest $request, ProfilePhotoService $photos, RegistrationVerificationEmailService $verificationEmail): JsonResponse
    {
        $validated = $request->validated();

        // The public registration endpoint always assigns the patient role.
        // Doctor verification and administrator creation use separate workflows.
        $photoPath = $request->hasFile('profile_photo') ? $photos->store($request->file('profile_photo'), 'patients') : null;

        try {
            $user = User::create([
                'name' => $validated['first_name'].' '.$validated['last_name'],
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'profile_image_path' => $photoPath,
                'role' => UserRole::Patient,
                'password' => $validated['password'],
            ]);
        } catch (Throwable $error) {
            $photos->discard($photoPath);
            throw $error;
        }

        $verificationEmailSent = $verificationEmail->send($user);

        return response()->json([
            'data' => [
                'user' => new AuthenticatedUserResource($user),
            ],
            'account_created' => true,
            'verification_email_sent' => $verificationEmailSent,
            ...($verificationEmailSent ? [] : ['code' => 'ACCOUNT_CREATED_BUT_VERIFICATION_EMAIL_FAILED']),
            'message' => $verificationEmailSent
                ? 'Patient account created successfully. Verify your email to sign in.'
                : 'Patient account created successfully, but the verification email could not be sent.',
        ], 201);
    }
}
