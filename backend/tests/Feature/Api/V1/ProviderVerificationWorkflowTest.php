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
        $this->getJson('/api/v1/admin/verifications')->assertOk()->assertJsonPath('data.verifications.0.id', $verificationId);
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
            ->assertJsonPath('data.status', 'action_required')
            ->assertJsonPath('data.admin_note', 'The uploaded document is expired.');
        $this->post('/api/v1/doctor/verification/documents', [
            'document_type' => 'practice_permit',
            'file' => $this->pdf('permit-current.pdf'),
        ], ['Accept' => 'application/json'])->assertOk();
        $this->postJson('/api/v1/doctor/verification/submit')
            ->assertOk()
            ->assertJsonPath('data.status', 'under_review');
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
        $this->postJson('/api/v1/admin/verifications/'.$lab->fresh()->providerVerification->id.'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', 'verified');
        $this->assertTrue($lab->fresh()->isProfessionallyVerified());
    }

    private function createDoctor(string $email = 'doctor.verify@example.com'): DoctorProfile
    {
        $user = User::factory()->create(['role' => UserRole::Doctor, 'email' => $email]);
        $profile = DoctorProfile::create([
            'user_id' => $user->id,
            'specialization_id' => Specialization::query()->firstOrFail()->id,
            'location_id' => Location::query()->firstOrFail()->id,
            'clinic_name' => 'Nile Clinic',
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
            'address' => 'Khartoum',
            'location_id' => Location::query()->where('code', 'khartoum')->valueOrFail('id'),
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

    private function pdf(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n");
    }
}
