<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\DoctorVerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateDoctorVerificationRequest;
use App\Models\DoctorProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use App\Services\ProviderVerificationService;

class DoctorVerificationController extends Controller
{
    public function __construct(private readonly ProviderVerificationService $verifications) {}
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
        $status = DoctorVerificationStatus::fromAdminInput($request->validated('status'));

        if ($status === DoctorVerificationStatus::Verified) {
            throw ValidationException::withMessages([
                'status' => 'Approve a submitted verification request instead of setting verified directly.',
            ]);
        }

        $this->verifications->syncLegacyStatus($doctor, $status, $request->user());

        return response()->json(['data' => ['provider' => $doctor->fresh(['user', 'specialization', 'location', 'cityProposal'])], 'message' => 'Provider verification status updated.']);
    }
}
