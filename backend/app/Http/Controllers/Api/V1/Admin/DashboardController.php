<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AppointmentStatus;
use App\Enums\CustomerInquiryStatus;
use App\Enums\DoctorVerificationStatus;
use App\Enums\LaboratoryCatalogRequestStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Appointment;
use App\Models\CustomerInquiry;
use App\Models\DoctorProfile;
use App\Models\ProviderReview;
use App\Models\LaboratoryCatalogRequest;
use App\Models\LaboratoryProfile;
use App\Models\ProviderVerification;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $awaitingReview = ProviderVerification::query()->where('status', DoctorVerificationStatus::UnderReview->value)->count();
        $inquiriesNew = CustomerInquiry::query()->where('status', CustomerInquiryStatus::New->value)->count();
        $testPending = LaboratoryCatalogRequest::query()->where('status', LaboratoryCatalogRequestStatus::Pending->value)->count();

        return response()->json(['data' => [
            'metrics' => [
                'verifications_awaiting_review' => $awaitingReview,
                'inquiries_new' => $inquiriesNew,
                'test_requests_pending' => $testPending,
                'users_total' => User::query()->count(),
                'pending_doctors' => DoctorProfile::whereIn('verification_status', DoctorVerificationStatus::incompleteValues())->count(),
                'verified_doctors' => DoctorProfile::where('verification_status', DoctorVerificationStatus::Verified->value)->count(),
                'verified_laboratories' => LaboratoryProfile::where('verification_status', DoctorVerificationStatus::Verified->value)->count(),
                'suspended_doctors' => DoctorProfile::where('verification_status', DoctorVerificationStatus::Suspended->value)->count(),
                'registered_patients' => User::where('role', UserRole::Patient->value)->count(),
                'registered_doctors' => User::where('role', UserRole::Doctor->value)->count(),
                'upcoming_appointments' => Appointment::where('starts_at', '>=', now())->where('status', AppointmentStatus::Confirmed->value)->count(),
                'completed_appointments' => Appointment::where('status', AppointmentStatus::Completed->value)->count(),
                'reviews' => ProviderReview::query()->forDoctors()->count(),
            ],
            'attention' => $this->attention(),
            'queues' => $this->queues(),
            'recent_activity' => AdminAuditLog::query()
                ->with('administrator:id,name')
                ->latest('id')
                ->limit(12)
                ->get()
                ->map(fn (AdminAuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'admin_name' => $log->administrator?->name,
                    'subject_type' => $log->subject_type,
                    'subject_id' => $log->subject_id,
                    'created_at' => $log->created_at?->toIso8601String(),
                ]),
        ]]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function attention(): array
    {
        $items = [];

        foreach (ProviderVerification::query()->with('verifiable.user:id,name')->where('status', DoctorVerificationStatus::UnderReview->value)->latest('submitted_at')->limit(6)->get() as $verification) {
            $profile = $verification->verifiable;
            $items[] = [
                'key' => 'verification-'.$verification->id,
                'kind' => 'verification',
                'section' => 'verification',
                'id' => $verification->id,
                'title' => $profile instanceof \App\Models\LaboratoryProfile ? 'Laboratory verification submitted' : 'Doctor verification submitted',
                'subtitle' => $profile instanceof \App\Models\LaboratoryProfile ? (string) $profile->name : (string) ($profile?->user?->name ?? ''),
                'at' => $verification->submitted_at?->toIso8601String() ?? $verification->updated_at?->toIso8601String(),
                'provider_type' => $profile instanceof \App\Models\LaboratoryProfile ? 'laboratory' : 'doctor',
                'status' => $verification->status->value,
            ];
        }

        foreach (CustomerInquiry::query()->where('status', CustomerInquiryStatus::New->value)->latest('last_message_at')->limit(4)->get() as $inquiry) {
            $items[] = [
                'key' => 'inquiry-'.$inquiry->id,
                'kind' => 'inquiry',
                'section' => 'inquiries',
                'id' => $inquiry->id,
                'title' => 'Customer inquiry unanswered',
                'subtitle' => $inquiry->subject,
                'at' => $inquiry->last_message_at?->toIso8601String() ?? $inquiry->created_at?->toIso8601String(),
            ];
        }

        foreach (LaboratoryCatalogRequest::query()->where('status', LaboratoryCatalogRequestStatus::Pending->value)->latest()->limit(4)->get() as $request) {
            $items[] = [
                'key' => 'test-'.$request->id,
                'kind' => 'test',
                'section' => 'requests',
                'id' => $request->id,
                'title' => 'New laboratory test requested',
                'subtitle' => $request->suggested_name,
                'at' => $request->created_at?->toIso8601String(),
            ];
        }

        return collect($items)->sortByDesc('at')->values()->take(8)->all();
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    private function queues(): array
    {
        $verifications = [];
        foreach (ProviderVerification::query()->with('verifiable.user:id,name')->where('status', DoctorVerificationStatus::UnderReview->value)->latest('submitted_at')->limit(5)->get() as $verification) {
            $profile = $verification->verifiable;
            $verifications[] = [
                'key' => 'verification-'.$verification->id,
                'kind' => 'verification',
                'section' => 'verification',
                'id' => $verification->id,
                'subtitle' => $profile instanceof LaboratoryProfile ? (string) $profile->name : (string) ($profile?->user?->name ?? ''),
                'at' => $verification->submitted_at?->toIso8601String() ?? $verification->updated_at?->toIso8601String(),
                'provider_type' => $profile instanceof LaboratoryProfile ? 'laboratory' : 'doctor',
                'status' => is_object($verification->status) ? $verification->status->value : $verification->status,
            ];
        }

        $inquiries = CustomerInquiry::query()->where('status', CustomerInquiryStatus::New->value)->latest('last_message_at')->limit(5)->get()
            ->map(fn (CustomerInquiry $inquiry) => [
                'key' => 'inquiry-'.$inquiry->id,
                'kind' => 'inquiry',
                'section' => 'inquiries',
                'id' => $inquiry->id,
                'subtitle' => $inquiry->subject,
                'at' => $inquiry->last_message_at?->toIso8601String() ?? $inquiry->created_at?->toIso8601String(),
                'sender' => $inquiry->name,
                'status' => $inquiry->status->value,
            ])->all();

        $tests = LaboratoryCatalogRequest::query()->where('status', LaboratoryCatalogRequestStatus::Pending->value)->latest()->limit(5)->get()
            ->map(fn (LaboratoryCatalogRequest $request) => [
                'key' => 'test-'.$request->id,
                'kind' => 'test',
                'section' => 'requests',
                'id' => $request->id,
                'subtitle' => $request->suggested_name,
                'at' => $request->created_at?->toIso8601String(),
                'status' => $request->status->value,
            ])->all();

        return [
            'verifications' => $verifications,
            'inquiries' => $inquiries,
            'tests' => $tests,
        ];
    }
}
