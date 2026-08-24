<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\DoctorVerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateDoctorVerificationRequest;
use App\Models\DoctorProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class DoctorVerificationController extends Controller
{
    public function index(): JsonResponse
    {
        $profiles = DoctorProfile::query()
            ->with(['user:id,name,email,phone', 'specialization:id,code,name_en,name_ar,is_active', 'location:id,code,name_en,name_ar,is_active', 'cityProposal'])
            ->latest()
            ->get();

        return response()->json(['data' => ['providers' => $profiles]]);
    }

    public function update(UpdateDoctorVerificationRequest $request, DoctorProfile $doctor): JsonResponse
    {
        $status = DoctorVerificationStatus::from($request->validated('status'));

        if ($status === DoctorVerificationStatus::Verified) {
            $doctor->load(['location', 'specialization', 'cityProposal']);

            if (! $doctor->location_id || ! $doctor->location?->is_active) {
                throw ValidationException::withMessages(['status' => 'Resolve the provider city before verification.']);
            }

            if (! $doctor->specialization?->is_active) {
                throw ValidationException::withMessages(['status' => 'The provider specialization must be active before verification.']);
            }

            if (! $doctor->profile_image_path) {
                throw ValidationException::withMessages(['status' => 'A provider profile picture is required before verification.']);
            }

            if ($doctor->cityProposal?->status?->value === 'pending') {
                throw ValidationException::withMessages(['status' => 'Resolve the pending city proposal before verification.']);
            }
        }

        $doctor->update(['verification_status' => $status->value]);

        return response()->json(['data' => ['provider' => $doctor->fresh(['user', 'specialization', 'location', 'cityProposal'])], 'message' => 'Provider verification status updated.']);
    }
}
