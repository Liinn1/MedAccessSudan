<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AppointmentStatus;
use App\Enums\DoctorVerificationStatus;
use App\Enums\UserRole;
use App\Models\AdminAuditLog;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_routes_require_an_administrative_role(): void
    {
        $this->getJson('/api/v1/admin/dashboard')->assertUnauthorized();
        foreach ([UserRole::Patient, UserRole::Doctor] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role, 'is_active' => true]));
            $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
        }
    }

    public function test_active_admin_can_login_but_patient_cannot_use_admin_login(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true, 'password' => 'SecurePassword123!']);
        $patient = User::factory()->create(['role' => UserRole::Patient, 'is_active' => true, 'password' => 'SecurePassword123!']);
        $this->postJson('/api/v1/admin/login', ['identifier' => $admin->email, 'password' => 'SecurePassword123!'])->assertOk()->assertJsonPath('data.user.role', 'admin');
        auth('web')->logout();
        $this->postJson('/api/v1/admin/login', ['identifier' => $patient->email, 'password' => 'SecurePassword123!'])->assertUnprocessable()->assertJsonPath('code', 'INVALID_CREDENTIALS');
    }

    public function test_active_super_admin_can_login_and_access_the_dashboard(): void
    {
        $superAdmin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'is_active' => true,
            'password' => 'SecurePassword123!',
        ]);

        $this->postJson('/api/v1/admin/login', [
            'identifier' => strtoupper($superAdmin->email),
            'password' => 'SecurePassword123!',
        ])->assertOk()->assertJsonPath('data.user.role', 'super_admin');

        $this->getJson('/api/v1/admin/dashboard')->assertOk();
    }

    public function test_wrong_super_admin_password_is_rejected(): void
    {
        $superAdmin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'is_active' => true,
            'password' => 'SecurePassword123!',
        ]);

        $this->postJson('/api/v1/admin/login', [
            'identifier' => $superAdmin->email,
            'password' => 'wrong-password',
        ])->assertUnprocessable()->assertJsonPath('code', 'INVALID_CREDENTIALS');
    }

    public function test_super_admin_can_create_admin_and_action_is_audited(): void
    {
        $super = User::factory()->create(['role' => UserRole::SuperAdmin, 'is_active' => true]);
        Sanctum::actingAs($super);
        $response = $this->postJson('/api/v1/admin/administrators', ['name' => 'Operations Admin', 'email' => 'operations@example.test', 'password' => 'SecurePassword123!', 'password_confirmation' => 'SecurePassword123!', 'role' => 'admin']);
        $response->assertCreated()->assertJsonPath('data.admin.role', 'admin');
        $this->assertDatabaseHas('admin_audit_logs', ['admin_user_id' => $super->id, 'action' => 'admin.created']);
    }

    public function test_normal_admin_cannot_manage_administrators(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]));
        $this->postJson('/api/v1/admin/administrators', ['name' => 'Blocked', 'email' => 'blocked@example.test', 'password' => 'SecurePassword123!', 'password_confirmation' => 'SecurePassword123!', 'role' => 'super_admin'])->assertForbidden();
    }

    public function test_dashboard_metrics_are_database_backed(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        User::factory()->count(2)->create(['role' => UserRole::Patient]);
        $doctor = User::factory()->create(['role' => UserRole::Doctor]);
        $specialization = Specialization::create(['code' => 'test', 'name_en' => 'Test', 'name_ar' => 'اختبار', 'is_active' => true]);
        $location = Location::create(['code' => 'TST', 'name_en' => 'Test City', 'name_ar' => 'مدينة', 'normalized_name' => 'test city', 'is_active' => true]);
        DoctorProfile::create(['user_id' => $doctor->id, 'specialization_id' => $specialization->id, 'location_id' => $location->id, 'verification_status' => DoctorVerificationStatus::Pending]);
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/admin/dashboard')->assertOk()->assertJsonPath('data.metrics.registered_patients', 2)->assertJsonPath('data.metrics.pending_doctors', 1);
    }
}
