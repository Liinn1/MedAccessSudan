<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\LaboratoryCatalogRequestStatus;
use App\Enums\UserRole;
use App\Mail\InquiryReplyMail;
use App\Models\LabTest;
use App\Models\LabTestCategory;
use App\Models\LaboratoryCatalogRequest;
use App\Models\User;
use Database\Seeders\LabTestCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_cannot_access_admin_user_or_inquiry_routes(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient, 'is_active' => true]));
        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->getJson('/api/v1/admin/inquiries')->assertForbidden();
        $this->getJson('/api/v1/admin/catalog-requests')->assertForbidden();
    }

    public function test_public_contact_creates_inquiry_and_admin_can_reply(): void
    {
        Mail::fake();
        $this->postJson('/api/v1/contact', [
            'name' => 'Sara Patient',
            'email' => 'sara@example.test',
            'subject' => 'Unable to access my laboratory result',
            'message' => 'I cannot open the PDF from My Appointments.',
        ])->assertCreated();

        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.metrics.inquiries_new', 1);

        $list = $this->getJson('/api/v1/admin/inquiries?status=new')->assertOk();
        $id = $list->json('data.inquiries.0.id');
        $this->postJson("/api/v1/admin/inquiries/{$id}/replies", [
            'body' => 'Thank you for contacting MedAccess. We will look into this.',
        ])->assertOk()->assertJsonPath('data.status', 'in_progress');
        Mail::assertSent(InquiryReplyMail::class);
        $this->assertDatabaseHas('customer_inquiry_messages', ['author_type' => 'admin', 'admin_user_id' => $admin->id]);
    }

    public function test_admin_can_create_patient_and_cannot_deactivate_last_super_admin(): void
    {
        $super = User::factory()->create(['role' => UserRole::SuperAdmin, 'is_active' => true]);
        Sanctum::actingAs($super);
        $this->postJson('/api/v1/admin/users', [
            'account_type' => 'patient',
            'first_name' => 'Amina',
            'last_name' => 'Hassan',
            'email' => 'amina.created@example.test',
            'phone' => '0912345678',
            'password' => 'SecurePass1',
            'password_confirmation' => 'SecurePass1',
        ])->assertCreated()->assertJsonPath('data.user.role', 'patient');
        $this->assertDatabaseMissing('users', ['email' => 'amina.created@example.test', 'password' => 'SecurePass1']);

        $this->patchJson("/api/v1/admin/users/{$super->id}", ['is_active' => false])->assertForbidden();
    }

    public function test_catalog_request_maps_to_existing_cbc_instead_of_duplicating(): void
    {
        $this->seed(LabTestCatalogSeeder::class);
        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        $labUser = User::factory()->create(['role' => UserRole::Laboratory, 'is_active' => true]);
        $profile = $labUser->laboratoryProfile()->create([
            'name' => 'Al Amal Laboratory',
            'address' => 'Omdurman',
            'verification_status' => 'pending_documents',
        ]);
        $request = LaboratoryCatalogRequest::query()->create([
            'laboratory_profile_id' => $profile->id,
            'requested_by_user_id' => $labUser->id,
            'suggested_name' => 'Complete Blood Count',
            'suggested_lab_test_category_id' => LabTestCategory::query()->where('slug', 'hematology')->value('id'),
            'status' => LaboratoryCatalogRequestStatus::Pending,
        ]);
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $count = LabTest::query()->count();
        Sanctum::actingAs($admin);
        $this->patchJson("/api/v1/admin/catalog-requests/{$request->id}", [
            'action' => 'approve',
            'name_en' => 'CBC',
            'lab_test_category_id' => $cbc->lab_test_category_id,
        ])->assertUnprocessable();
        $this->patchJson("/api/v1/admin/catalog-requests/{$request->id}", [
            'action' => 'map',
            'lab_test_id' => $cbc->id,
        ])->assertOk()->assertJsonPath('data.status', 'approved')->assertJsonPath('data.resolved_test.id', $cbc->id);
        $this->assertSame($count, LabTest::query()->count());
    }

    public function test_account_directory_excludes_admins_and_supports_provider_filters(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        User::factory()->create(['role' => UserRole::SuperAdmin, 'is_active' => true, 'name' => 'Hidden Super']);
        User::factory()->create(['role' => UserRole::Patient, 'is_active' => true, 'name' => 'Raghad Patient']);
        $doctor = User::factory()->create(['role' => UserRole::Doctor, 'is_active' => true, 'name' => 'Ahmed Doctor']);
        $specialization = \App\Models\Specialization::create(['code' => 'acct-test', 'name_en' => 'Test', 'name_ar' => 'اختبار', 'is_active' => true]);
        $location = \App\Models\Location::create(['code' => 'ACT', 'name_en' => 'Account City', 'name_ar' => 'مدينة', 'normalized_name' => 'account city', 'is_active' => true]);
        $doctor->doctorProfile()->create([
            'specialization_id' => $specialization->id,
            'location_id' => $location->id,
            'verification_status' => 'verified',
        ]);
        $lab = User::factory()->create(['role' => UserRole::Laboratory, 'is_active' => true, 'name' => 'HealthCare Lab']);
        $lab->laboratoryProfile()->create(['name' => 'HealthCare Lab', 'address' => 'Khartoum', 'verification_status' => 'pending_documents']);

        Sanctum::actingAs($admin);
        $all = $this->getJson('/api/v1/admin/users')->assertOk();
        $names = collect($all->json('data.users'))->pluck('name')->all();
        $this->assertContains('Raghad Patient', $names);
        $this->assertNotContains('Hidden Super', $names);
        $this->assertSame(3, $all->json('data.meta.total'));

        $providers = $this->getJson('/api/v1/admin/users?role=providers')->assertOk();
        $this->assertSame(2, $providers->json('data.meta.total'));
        $this->getJson('/api/v1/admin/users?role=laboratory&verification=pending')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.users.0.name', 'HealthCare Lab');
    }

    public function test_admin_can_suspend_and_reactivate_a_patient_without_deleting_the_account(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        $patient = User::factory()->create(['role' => UserRole::Patient, 'is_active' => true, 'email' => 'raghad@example.test']);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/v1/admin/users/{$patient->id}", ['is_active' => false, 'reason' => 'Abuse'])
            ->assertOk()
            ->assertJsonPath('data.user.is_active', false);
        $this->assertDatabaseHas('users', ['id' => $patient->id, 'email' => 'raghad@example.test', 'is_active' => false]);

        Sanctum::actingAs($patient->fresh());
        $this->getJson('/api/v1/patient/home')->assertForbidden()->assertJsonPath('code', 'ACCOUNT_SUSPENDED');

        Sanctum::actingAs($admin);
        $this->patchJson("/api/v1/admin/users/{$patient->id}", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('data.user.is_active', true);
        Sanctum::actingAs($patient->fresh());
        $this->getJson('/api/v1/patient/home')->assertOk();
    }

    public function test_suspending_a_doctor_does_not_change_verification_and_blocks_protected_access(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        $doctor = User::factory()->create(['role' => UserRole::Doctor, 'is_active' => true, 'name' => 'Verified Doctor']);
        $specialization = \App\Models\Specialization::create(['code' => 'acct-verify', 'name_en' => 'Cardiology', 'name_ar' => 'قلب', 'is_active' => true]);
        $location = \App\Models\Location::create(['code' => 'VRF', 'name_en' => 'Omdurman', 'name_ar' => 'أم درمان', 'normalized_name' => 'omdurman', 'is_active' => true]);
        $doctor->doctorProfile()->create([
            'specialization_id' => $specialization->id,
            'location_id' => $location->id,
            'clinic_name' => 'Nile Clinic',
            'verification_status' => 'verified',
        ]);

        Sanctum::actingAs($admin);
        $this->getJson("/api/v1/admin/users/{$doctor->id}")
            ->assertOk()
            ->assertJsonPath('data.user.id', $doctor->id)
            ->assertJsonPath('data.user.verification_status', 'verified')
            ->assertJsonPath('data.user.doctor_profile.clinic_name', 'Nile Clinic')
            ->assertJsonPath('data.user.doctor_profile.specialization.code', 'acct-verify')
            ->assertJsonPath('data.user.doctor_profile.location.code', 'VRF');

        $this->patchJson("/api/v1/admin/users/{$doctor->id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.user.is_active', false)
            ->assertJsonPath('data.user.verification_status', 'verified');

        $this->assertFalse($doctor->fresh()->is_active);
        $verification = $doctor->fresh()->doctorProfile?->verification_status;
        $this->assertSame('verified', $verification instanceof \App\Enums\DoctorVerificationStatus ? $verification->value : $verification);

        Sanctum::actingAs($doctor->fresh());
        $this->getJson('/api/v1/auth/me')->assertForbidden()->assertJsonPath('code', 'ACCOUNT_SUSPENDED');
        $this->getJson('/api/v1/doctor/dashboard')->assertForbidden()->assertJsonPath('code', 'ACCOUNT_SUSPENDED');
    }
}
