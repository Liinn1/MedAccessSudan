<?php

namespace Tests\Feature\Api\V1;

use App\Enums\DoctorVerificationStatus;
use App\Enums\UserRole;
use App\Models\DoctorAvailabilitySchedule;
use App\Models\DoctorProfile;
use App\Models\LaboratoryProfile;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use App\Models\VerificationDocument;
use Database\Seeders\LabTestCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProviderVerificationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        config()->set('medaccess.demo_auto_verify_doctors', false);
        $this->seed(LabTestCatalogSeeder::class);
    }

    public function test_demo_flag_cannot_auto_verify_a_new_doctor(): void
    {
        Storage::fake('public');
        config()->set('medaccess.demo_auto_verify_doctors', true);
        $this->postJson('/api/v1/auth/register/doctor', [
            'first_name' => 'Musa',
            'last_name' => 'Ahmed',
            'email' => 'musa.doctor@example.com',
            'phone' => '+249111222555',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
            'specialization' => 'general_medicine',
            'location' => 'SD-KH',
            'address' => 'Khartoum, Al Riyadh',
            'profile_photo' => UploadedFile::fake()->createWithContent(
                'doctor.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=')
            ),
        ])->assertCreated();

        $doctor = User::query()->where('email', 'musa.doctor@example.com')->firstOrFail();
        $this->assertSame('pending_documents', $doctor->doctorProfile->verification_status);
        $this->assertFalse($doctor->doctorProfile->isProfessionallyVerified());
    }

    public function test_mobile_doctor_onboarding_reaches_admin_review_and_observes_approval(): void
    {
        Storage::fake('public');

        $this->post('/api/v1/auth/register/doctor', [
            'first_name' => 'Mobile',
            'last_name' => 'Doctor',
            'email' => 'mobile.doctor@example.com',
            'phone' => '+249111222556',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
            'specialization' => 'general_medicine',
            'location' => 'SD-KH',
            'address' => 'Khartoum, Al Riyadh',
            'clinic_name' => 'Mobile Care Clinic',
            'offers_clinic_visits' => '1',
            'offers_home_visits' => '1',
            'profile_photo' => UploadedFile::fake()->createWithContent(
                'doctor.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=')
            ),
        ], ['Accept' => 'application/json'])->assertCreated();

        $doctor = User::query()->where('email', 'mobile.doctor@example.com')->firstOrFail();
        $profile = $doctor->doctorProfile()->with(['providerVerification.documents', 'specialization', 'location'])->firstOrFail();
        $this->assertSame('general_medicine', $profile->specialization->code);
        $this->assertSame('SD-KH', $profile->location->code);
        $this->assertTrue($profile->offers_clinic_visits);
        $this->assertTrue($profile->offers_home_visits);
        $this->assertSame(DoctorVerificationStatus::PendingDocuments->value, $profile->verification_status);
        $this->assertNotNull($profile->providerVerification);

        Sanctum::actingAs($doctor);
        $this->uploadRequired($doctor, 'doctor');
        $this->postJson('/api/v1/doctor/verification/submit')
            ->assertOk()
            ->assertJsonPath('data.status', DoctorVerificationStatus::UnderReview->value);

        $verification = $profile->fresh()->providerVerification;
        $this->assertCount(3, $verification->documents);
        foreach ($verification->documents as $document) {
            Storage::disk($document->disk)->assertExists($document->path);
        }

        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/admin/verifications?provider_type=doctor&status=under_review')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $verification->id,
                'provider_name' => 'Mobile Doctor',
                'status' => DoctorVerificationStatus::UnderReview->value,
            ]);
        $this->get('/api/v1/admin/verifications/'.$verification->id.'/documents/'.$verification->documents->first()->id)
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->approveAllCurrentDocuments($verification->id);
        $this->postJson('/api/v1/admin/verifications/'.$verification->id.'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', DoctorVerificationStatus::Verified->value);

        Sanctum::actingAs($doctor);
        $this->getJson('/api/v1/doctor/verification')
            ->assertOk()
            ->assertJsonPath('data.status', DoctorVerificationStatus::Verified->value);
    }

    public function test_new_doctor_starts_unverified_can_login_and_cannot_self_verify(): void
    {
        $profile = $this->createDoctor();
        Sanctum::actingAs($profile->user);

        $this->getJson('/api/v1/doctor/verification')
            ->assertOk()
            ->assertJsonPath('data.status', DoctorVerificationStatus::PendingDocuments->value)
            ->assertJsonPath('data.can_submit', false);

        $this->putJson('/api/v1/doctor/profile', [
            'clinic_name' => 'Clinic',
            'verification_status' => 'verified',
        ])->assertUnprocessable();

        $this->assertSame(DoctorVerificationStatus::PendingDocuments->value, $profile->fresh()->verification_status);
        $this->assertFalse($profile->fresh()->isProfessionallyVerified());

        $this->putJson('/api/v1/doctor/schedule', [
            'consultation_type' => 'clinic',
            'periods' => [[
                'day_of_week' => 1,
                'start_time' => '09:00',
                'end_time' => '11:00',
                'slot_duration_minutes' => 30,
            ]],
        ])->assertForbidden()->assertJsonPath('code', 'PROVIDER_UNVERIFIED');
    }

    public function test_invalid_file_is_rejected_and_incomplete_submission_is_blocked(): void
    {
        $profile = $this->createDoctor();
        Sanctum::actingAs($profile->user);

        $this->post('/api/v1/doctor/verification/documents', [
            'document_type' => 'professional_license',
            'file' => UploadedFile::fake()->createWithContent('license.exe', 'MZ'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->post('/api/v1/doctor/verification/documents', [
            'document_type' => 'professional_license',
            'file' => $this->pdf('license.pdf'),
        ], ['Accept' => 'application/json'])->assertOk();

        $this->postJson('/api/v1/doctor/verification/submit')->assertUnprocessable();
        $this->assertSame(DoctorVerificationStatus::PendingDocuments->value, $profile->fresh()->verification_status);
    }

    public function test_complete_doctor_submission_goes_under_review_and_is_not_patient_bookable_until_admin_approves(): void
    {
        $profile = $this->createDoctor();
        $this->addSchedule($profile);
        Sanctum::actingAs($profile->user);
        $this->uploadRequired($profile->user, 'doctor');
        $this->postJson('/api/v1/doctor/verification/submit')
            ->assertOk()
            ->assertJsonPath('data.status', DoctorVerificationStatus::UnderReview->value);

        $this->post('/api/v1/doctor/verification/documents', [
            'document_type' => 'identification',
            'file' => $this->pdf('id-2.pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);
        $this->getJson('/api/v1/patient/doctors?specialization='.$profile->specialization->code)
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
        $this->getJson("/api/v1/patient/doctors/{$profile->id}")->assertNotFound();

        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        Sanctum::actingAs($admin);
        $verificationId = $profile->fresh()->providerVerification->id;
        $this->getJson('/api/v1/admin/verifications?status=under_review')->assertOk()->assertJsonPath('data.verifications.0.id', $verificationId);
        $this->approveAllCurrentDocuments($verificationId);
        $this->postJson("/api/v1/admin/verifications/{$verificationId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'verified');

        $this->assertSame('verified', $profile->fresh()->verification_status);
        $this->assertNotNull($profile->fresh()->providerVerification->reviewed_at);
        $this->assertSame($admin->id, $profile->fresh()->providerVerification->reviewed_by_user_id);

        Sanctum::actingAs($patient);
        $this->getJson('/api/v1/patient/doctors?specialization='.$profile->specialization->code)
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    public function test_doctor_cannot_access_another_providers_document(): void
    {
        $owner = $this->createDoctor();
        Sanctum::actingAs($owner->user);
        $this->uploadRequired($owner->user, 'doctor');
        $document = VerificationDocument::query()->firstOrFail();

        $other = $this->createDoctor('other.doctor@example.com');
        Sanctum::actingAs($other->user);
        $this->get("/api/v1/doctor/verification/documents/{$document->id}")->assertForbidden();

        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);
        $this->get("/api/v1/doctor/verification/documents/{$document->id}")->assertForbidden();
    }

    public function test_action_required_allows_replacement_and_resubmission(): void
    {
        $profile = $this->createDoctor();
        Sanctum::actingAs($profile->user);
        $this->uploadRequired($profile->user, 'doctor');
        $this->postJson('/api/v1/doctor/verification/submit')->assertOk();
        $verification = $profile->fresh()->providerVerification;
        $document = $verification->documents()->where('document_type', 'practice_permit')->latest('id')->firstOrFail();

        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/v1/admin/verifications/{$verification->id}/documents/{$document->id}", [
            'status' => 'rejected',
            'admin_note' => 'The uploaded document is expired.',
        ])->assertOk()->assertJsonPath('data.status', 'action_required');

        Sanctum::actingAs($profile->user);
        $this->getJson('/api/v1/doctor/verification')
            ->assertJsonPath('data.status', 'action_required');
        $this->assertSame(
            'The uploaded document is expired.',
            collect($this->getJson('/api/v1/doctor/verification')->json('data.requirements'))
                ->firstWhere('document_type', 'practice_permit')['current']['admin_note']
        );

        $this->post('/api/v1/doctor/verification/documents', [
            'document_type' => 'professional_license',
            'file' => $this->pdf('license-2.pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->patchJson("/api/v1/admin/verifications/{$verification->id}/documents/{$document->id}", [
            'status' => 'rejected',
            'admin_note' => 'Duplicate replacement request.',
        ])->assertForbidden();

        Sanctum::actingAs($admin);
        $this->patchJson("/api/v1/admin/verifications/{$verification->id}/documents/{$document->id}", [
            'status' => 'rejected',
            'admin_note' => 'Duplicate replacement request.',
        ])->assertUnprocessable();

        Sanctum::actingAs($profile->user);
        $this->post('/api/v1/doctor/verification/documents', [
            'document_type' => 'practice_permit',
            'file' => $this->pdf('permit-current.pdf'),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.status', 'under_review');

        $this->assertDatabaseHas('verification_documents', [
            'id' => $document->id,
            'status' => 'replaced',
            'admin_note' => 'The uploaded document is expired.',
        ]);
    }

    public function test_healthcarelab_replacement_is_document_scoped_and_blocks_final_approval(): void
    {
        $lab = $this->createLaboratory();
        $lab->update(['name' => 'HealthCareLab']);
        Sanctum::actingAs($lab->user);
        $this->uploadRequired($lab->user, 'laboratory');
        $this->postJson('/api/v1/laboratory/verification/submit')->assertOk();

        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        Sanctum::actingAs($admin);
        $verification = $lab->fresh()->providerVerification;
        $docs = collect($this->getJson('/api/v1/admin/verifications/'.$verification->id)->json('data.requirements'))
            ->mapWithKeys(fn (array $item) => [$item['document_type'] => $item['current']]);

        $this->patchJson("/api/v1/admin/verifications/{$verification->id}/documents/{$docs['registration_certificate']['id']}", [
            'status' => 'approved',
        ])->assertOk();
        $this->patchJson("/api/v1/admin/verifications/{$verification->id}/documents/{$docs['operating_license']['id']}", [
            'status' => 'rejected',
            'admin_note' => 'Please upload a clearer copy of the operating license.',
        ])->assertOk()->assertJsonPath('data.status', 'action_required');
        $this->patchJson("/api/v1/admin/verifications/{$verification->id}/documents/{$docs['responsible_identification']['id']}", [
            'status' => 'approved',
        ])->assertOk();

        $this->postJson("/api/v1/admin/verifications/{$verification->id}/approve")
            ->assertUnprocessable()
            ->assertJsonPath('errors.status.0', 'All required verification documents must be approved before the provider can be verified.');

        $shown = collect($this->getJson('/api/v1/admin/verifications/'.$verification->id)->json('data.requirements'))
            ->mapWithKeys(fn (array $item) => [$item['document_type'] => $item['current']['status']]);
        $this->assertSame('approved', $shown['registration_certificate']);
        $this->assertSame('rejected', $shown['operating_license']);
        $this->assertSame('approved', $shown['responsible_identification']);

        Sanctum::actingAs($lab->user);
        $providerView = $this->getJson('/api/v1/laboratory/verification')->assertOk()->json('data');
        $this->assertSame('action_required', $providerView['status']);
        $operating = collect($providerView['requirements'])->firstWhere('document_type', 'operating_license')['current'];
        $this->assertSame('rejected', $operating['status']);
        $this->assertSame('Please upload a clearer copy of the operating license.', $operating['admin_note']);

        $this->post('/api/v1/laboratory/verification/documents', [
            'document_type' => 'operating_license',
            'file' => $this->pdf('operating-license-clear.pdf'),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.status', 'under_review');

        $this->assertDatabaseHas('verification_documents', [
            'id' => $docs['operating_license']['id'],
            'status' => 'replaced',
        ]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/verifications/{$verification->id}/approve")->assertUnprocessable();
        $afterReplace = collect($this->getJson('/api/v1/admin/verifications/'.$verification->id)->json('data.requirements'))
            ->mapWithKeys(fn (array $item) => [$item['document_type'] => $item['current']['status']]);
        $this->assertSame('approved', $afterReplace['registration_certificate']);
        $this->assertSame('pending', $afterReplace['operating_license']);
        $this->assertSame('approved', $afterReplace['responsible_identification']);

        $replacementId = collect($this->getJson('/api/v1/admin/verifications/'.$verification->id)->json('data.requirements'))
            ->firstWhere('document_type', 'operating_license')['current']['id'];
        $this->patchJson("/api/v1/admin/verifications/{$verification->id}/documents/{$replacementId}", [
            'status' => 'approved',
        ])->assertOk();
        $this->postJson("/api/v1/admin/verifications/{$verification->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'verified');
    }

    public function test_unverified_laboratory_is_hidden_from_patients_until_approved(): void
    {
        $lab = $this->createLaboratory();
        Sanctum::actingAs($lab->user);
        $this->getJson('/api/v1/laboratory/verification')->assertJsonPath('data.status', 'pending_documents');
        $this->uploadRequired($lab->user, 'laboratory');
        $this->postJson('/api/v1/laboratory/verification/submit')->assertJsonPath('data.status', 'under_review');

        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);
        $this->getJson('/api/v1/patient/laboratory-offerings')->assertOk();
        $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab->id,
            'lab_test_ids' => [1],
            'payment_method' => 'pay_later',
        ])->assertUnprocessable();

        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        Sanctum::actingAs($admin);
        $verificationId = $lab->fresh()->providerVerification->id;
        $this->approveAllCurrentDocuments($verificationId);
        $this->postJson('/api/v1/admin/verifications/'.$verificationId.'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', 'verified');
        $this->assertTrue($lab->fresh()->isProfessionallyVerified());
    }

    public function test_only_admins_can_approve_and_unauthenticated_users_cannot_read_documents(): void
    {
        $profile = $this->createDoctor();
        Sanctum::actingAs($profile->user);
        $this->uploadRequired($profile->user, 'doctor');
        $this->postJson('/api/v1/doctor/verification/submit')->assertOk();
        $verificationId = $profile->fresh()->providerVerification->id;
        $documentId = $profile->fresh()->providerVerification->documents()->firstOrFail()->id;

        $this->postJson("/api/v1/admin/verifications/{$verificationId}/approve")
            ->assertForbidden();

        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);
        $this->postJson("/api/v1/admin/verifications/{$verificationId}/approve")->assertForbidden();
        $this->get("/api/v1/admin/verifications/{$verificationId}/documents/{$documentId}")->assertForbidden();
    }

    public function test_guests_cannot_download_verification_documents(): void
    {
        $profile = $this->createDoctor();
        $service = app(\App\Services\ProviderVerificationService::class);
        foreach (['professional_license', 'practice_permit', 'identification'] as $type) {
            $service->upload($profile->user, $type, $this->pdf($type.'.pdf'));
        }
        $verification = $profile->fresh()->providerVerification;
        $documentId = $verification->documents()->firstOrFail()->id;

        $this->get("/api/v1/admin/verifications/{$verification->id}/documents/{$documentId}")->assertUnauthorized();
        $this->get("/api/v1/doctor/verification/documents/{$documentId}")->assertUnauthorized();
    }

    public function test_reset_command_clears_verified_providers_without_deleting_accounts(): void
    {
        $doctor = $this->createDoctor();
        $doctor->update(['verification_status' => DoctorVerificationStatus::Verified->value]);
        $doctor->providerVerification->update([
            'status' => DoctorVerificationStatus::Verified,
            'submitted_at' => now(),
            'reviewed_at' => now(),
            'reviewed_by_user_id' => User::factory()->create(['role' => UserRole::Admin])->id,
        ]);
        $userId = $doctor->user_id;

        $this->artisan('medaccess:reset-demo-provider-verification')->assertSuccessful();

        $this->assertDatabaseHas('users', ['id' => $userId]);
        $this->assertSame(DoctorVerificationStatus::PendingDocuments->value, $doctor->fresh()->verification_status);
        $this->assertNull($doctor->fresh()->providerVerification->submitted_at);
        $this->assertNull($doctor->fresh()->providerVerification->reviewed_at);
        $this->assertNull($doctor->fresh()->providerVerification->reviewed_by_user_id);
    }

    public function test_admin_cannot_approve_before_the_provider_submits(): void
    {
        $profile = $this->createDoctor();
        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/admin/verifications/'.$profile->providerVerification->id.'/approve')
            ->assertUnprocessable();
        $this->assertSame(DoctorVerificationStatus::PendingDocuments->value, $profile->fresh()->verification_status);
    }

    private function createDoctor(string $email = 'doctor.verify@example.com'): DoctorProfile
    {
        $user = User::factory()->create(['role' => UserRole::Doctor, 'email' => $email]);
        $profile = DoctorProfile::create([
            'user_id' => $user->id,
            'specialization_id' => Specialization::query()->firstOrFail()->id,
            'location_id' => Location::query()->firstOrFail()->id,
            'clinic_name' => 'Nile Clinic',
            'address' => 'Khartoum, Al Riyadh',
            'profile_image_path' => 'profile-photos/doctors/test.jpg',
            'verification_status' => DoctorVerificationStatus::PendingDocuments->value,
        ]);
        $profile->providerVerification()->create(['status' => DoctorVerificationStatus::PendingDocuments]);

        return $profile->load('user', 'specialization');
    }

    private function createLaboratory(): LaboratoryProfile
    {
        $user = User::factory()->create(['role' => UserRole::Laboratory, 'email' => 'lab.verify@example.com']);
        $profile = $user->laboratoryProfile()->create([
            'name' => 'Nile Diagnostics',
            'location_id' => Location::query()->where('code', 'SD-KH')->valueOrFail('id'),
            'address' => 'Khartoum, Al Riyadh',
            'profile_image_path' => 'profile-photos/laboratories/test.jpg',
            'verification_status' => DoctorVerificationStatus::PendingDocuments->value,
        ]);
        $profile->providerVerification()->create(['status' => DoctorVerificationStatus::PendingDocuments]);

        return $profile->load('user');
    }

    private function uploadRequired(User $user, string $role): void
    {
        $types = $role === 'doctor'
            ? ['professional_license', 'practice_permit', 'identification']
            : ['registration_certificate', 'operating_license', 'responsible_identification'];
        Sanctum::actingAs($user);
        foreach ($types as $type) {
            $this->post("/api/v1/{$role}/verification/documents", [
                'document_type' => $type,
                'file' => $this->pdf($type.'.pdf'),
            ], ['Accept' => 'application/json'])->assertOk();
        }
    }

    private function addSchedule(DoctorProfile $profile): void
    {
        DoctorAvailabilitySchedule::create([
            'doctor_profile_id' => $profile->id,
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'slot_duration_minutes' => 30,
            'is_active' => true,
        ]);
    }

    private function approveAllCurrentDocuments(int $verificationId): void
    {
        $requirements = $this->getJson("/api/v1/admin/verifications/{$verificationId}")->assertOk()->json('data.requirements');
        foreach ($requirements as $requirement) {
            $current = $requirement['current'] ?? null;
            if (! is_array($current) || ($current['status'] ?? null) === 'approved') {
                continue;
            }
            $this->patchJson("/api/v1/admin/verifications/{$verificationId}/documents/{$current['id']}", [
                'status' => 'approved',
            ])->assertOk();
        }
    }

    private function pdf(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n");
    }
}
