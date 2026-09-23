<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AppointmentStatus;
use App\Enums\CityProposalStatus;
use App\Enums\DoctorVerificationStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\CityProposal;
use App\Models\DoctorProfile;
use App\Models\DoctorReview;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['data' => ['metrics' => [
            'pending_doctors' => DoctorProfile::where('verification_status', DoctorVerificationStatus::Pending->value)->count(),
            'verified_doctors' => DoctorProfile::where('verification_status', DoctorVerificationStatus::Verified->value)->count(),
            'suspended_doctors' => DoctorProfile::where('verification_status', DoctorVerificationStatus::Suspended->value)->count(),
            'pending_city_proposals' => CityProposal::where('status', CityProposalStatus::Pending->value)->count(),
            'registered_patients' => User::where('role', UserRole::Patient->value)->count(),
            'registered_doctors' => User::where('role', UserRole::Doctor->value)->count(),
            'upcoming_appointments' => Appointment::where('starts_at', '>=', now())->where('status', AppointmentStatus::Confirmed->value)->count(),
            'completed_appointments' => Appointment::where('status', AppointmentStatus::Completed->value)->count(),
            'reviews' => DoctorReview::count(),
        ]]]);
    }
}
