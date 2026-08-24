<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterPatientRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class RegisterPatientController extends Controller
{
    public function __invoke(RegisterPatientRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // The public registration endpoint always assigns the patient role.
        // Doctor verification and administrator creation use separate workflows.
        $user = User::create([
            'name' => $validated['first_name'].' '.$validated['last_name'],
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'role' => UserRole::Patient,
            'password' => $validated['password'],
        ]);

        return response()->json([
            'data' => [
                'user' => new AuthenticatedUserResource($user),
            ],
            'message' => 'Patient account created successfully.',
        ], 201);
    }
}
