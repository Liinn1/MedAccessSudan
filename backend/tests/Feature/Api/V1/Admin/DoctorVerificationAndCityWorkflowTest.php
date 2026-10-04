<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\UserRole;
use App\Models\CityProposal;
use App\Models\DoctorAvailabilitySchedule;
use App\Models\DoctorProfile;
use App\Models\Location;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DoctorVerificationAndCityWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
        config()->set('medaccess.demo_auto_verify_doctors', false);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_doctor_can_register_with_an_existing_approved_city(): void
    {
        $location = Location::query()->where('code', 'khartoum')->firstOrFail();
        $response = $this->postJson('/api/v1/auth/register/doctor', $this->registrationPayload(['location' => $location->code]));

        $response->assertCreated();
        $this->assertDatabaseHas('doctor_profiles', [
            'location_id' => $location->id,
            'verification_status' => 'pending_documents',
        ]);
        $this->assertDatabaseCount('city_proposals', 0);
    }

    public function test_registered_doctor_cannot_publish_schedule_or_appear_in_search_until_admin_approves_documents(): void
    {
        CarbonImmutable::setTestNow('2026-08-24 08:00:00 Africa/Khartoum');
        Storage::fake('local');
        $this->postJson('/api/v1/auth/register/doctor', $this->registrationPayload(['location' => 'khartoum']))
            ->assertCreated();
        $doctor = User::query()->where('email', 'new.doctor@example.com')->firstOrFail();
        $profile = $doctor->doctorProfile;
        $this->assertSame('pending_documents', $profile->verification_status);

        Sanctum::actingAs($doctor);
        $this->putJson('/api/v1/doctor/schedule', ['consultation_type' => 'clinic', 'periods' => [[
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'slot_duration_minutes' => 30,
        ]]])->assertForbidden()->assertJsonPath('code', 'PROVIDER_UNVERIFIED');

        foreach (['professional_license', 'practice_permit', 'identification'] as $type) {
            $this->post('/api/v1/doctor/verification/documents', [
                'document_type' => $type,
                'file' => UploadedFile::fake()->createWithContent($type.'.pdf', "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n"),
            ], ['Accept' => 'application/json'])->assertOk();
        }
        $this->postJson('/api/v1/doctor/verification/submit')->assertOk()->assertJsonPath('data.status', 'under_review');

        $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
        Sanctum::actingAs($admin);
        $verificationId = $profile->fresh()->providerVerification->id;
        $this->approveAllCurrentDocuments($verificationId);
        $this->postJson('/api/v1/admin/verifications/'.$verificationId.'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', 'verified');

        Sanctum::actingAs($doctor);
        $this->putJson('/api/v1/doctor/schedule', ['consultation_type' => 'clinic', 'periods' => [[
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'slot_duration_minutes' => 30,
        ]]])->assertOk();

        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);
        $this->getJson('/api/v1/patient/doctors?specialization=general_medicine&location=khartoum&availability=today')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $slot = '2026-08-24T09:00:00+02:00';
        $availabilityUrl = "/api/v1/patient/doctors/{$profile->id}/availability?from=2026-08-24&to=2026-08-24";
        $this->getJson($availabilityUrl)->assertOk()->assertJsonFragment(['starts_at' => $slot]);
        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slot,
            'payment_method' => 'pay_later',
        ])->assertCreated();
        $this->getJson($availabilityUrl)->assertOk()->assertJsonMissing(['starts_at' => $slot]);
        $this->getJson('/api/v1/patient/appointments')->assertOk()->assertJsonCount(1, 'data');

        Sanctum::actingAs($doctor);
        $this->getJson('/api/v1/doctor/appointments')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_doctor_can_propose_a_city_but_cannot_review_it_and_patients_cannot_see_it(): void
    {
        $this->postJson('/api/v1/auth/register/doctor', $this->registrationPayload(['proposed_city' => '  New   Halfa  ']))->assertCreated();
        $doctor = User::query()->where('email', 'new.doctor@example.com')->firstOrFail();
        $proposal = CityProposal::query()->firstOrFail();

        $this->assertSame('New Halfa', $proposal->proposed_name);
        $this->assertNull($doctor->doctorProfile->location_id);
        $this->assertSame('pending_documents', $doctor->doctorProfile->verification_status);
        $this->assertDatabaseMissing('locations', ['normalized_name' => 'new halfa']);

        Sanctum::actingAs($doctor);
        $this->patchJson("/api/v1/admin/city-proposals/{$proposal->id}", ['action' => 'approve', 'name_en' => 'New Halfa'])->assertForbidden();

        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);
        $this->getJson('/api/v1/patient/doctor-filters')->assertOk()->assertJsonMissing(['code' => 'new-halfa']);
    }

    public function test_administrator_can_correct_and_approve_a_city_then_verify_the_provider(): void
    {
        CarbonImmutable::setTestNow('2026-08-24 08:00:00 Africa/Khartoum');
        $this->postJson('/api/v1/auth/register/doctor', $this->registrationPayload(['proposed_city' => 'portsudan']))->assertCreated();
        $profile = DoctorProfile::query()->firstOrFail();
        $proposal = CityProposal::query()->firstOrFail();
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/admin/city-proposals/{$proposal->id}", [
            'action' => 'approve',
            'name_en' => 'Port Sudan',
            'name_ar' => 'بورتسودان',
        ])->assertOk()->assertJsonPath('data.proposal.status', 'approved');

        $location = Location::query()->where('normalized_name', 'port sudan')->firstOrFail();
        $this->assertSame($location->id, $profile->fresh()->location_id);

        Sanctum::actingAs($profile->user);
        foreach (['professional_license', 'practice_permit', 'identification'] as $type) {
            $this->post('/api/v1/doctor/verification/documents', [
                'document_type' => $type,
                'file' => UploadedFile::fake()->createWithContent($type.'.pdf', "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n"),
            ], ['Accept' => 'application/json'])->assertOk();
        }
        $this->postJson('/api/v1/doctor/verification/submit')->assertOk();
        Sanctum::actingAs($admin);
        $verificationId = $profile->fresh()->providerVerification->id;
        $this->approveAllCurrentDocuments($verificationId);
        $this->postJson('/api/v1/admin/verifications/'.$verificationId.'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', 'verified');

        DoctorAvailabilitySchedule::create([
            'doctor_profile_id' => $profile->id,
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'slot_duration_minutes' => 30,
            'is_active' => true,
        ]);

        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);
        $this->getJson('/api/v1/patient/doctor-filters')->assertOk()->assertJsonFragment(['code' => 'port-sudan']);
        $this->getJson('/api/v1/patient/doctors?specialization=general_medicine&location=port-sudan&availability=today')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.doctors.0.location.code', 'port-sudan');
    }

    public function test_administrator_can_map_a_proposal_without_creating_a_duplicate_city(): void
    {
        $this->postJson('/api/v1/auth/register/doctor', $this->registrationPayload(['proposed_city' => 'omdurmaan']))->assertCreated();
        $profile = DoctorProfile::query()->firstOrFail();
        $proposal = CityProposal::query()->firstOrFail();
        $omdurman = Location::query()->where('code', 'omdurman')->firstOrFail();
        $locationCount = Location::count();
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));

        $this->patchJson("/api/v1/admin/city-proposals/{$proposal->id}", [
            'action' => 'map',
            'location_id' => $omdurman->id,
        ])->assertOk()->assertJsonPath('data.proposal.status', 'mapped');

        $this->assertSame($locationCount, Location::count());
        $this->assertSame($omdurman->id, $profile->fresh()->location_id);
    }

    public function test_corrected_duplicate_city_name_must_be_mapped_instead_of_created(): void
    {
        $this->postJson('/api/v1/auth/register/doctor', $this->registrationPayload(['proposed_city' => 'omdurmaan']))->assertCreated();
        $profile = DoctorProfile::query()->firstOrFail();
        $proposal = CityProposal::query()->firstOrFail();
        $omdurman = Location::query()->where('code', 'omdurman')->firstOrFail();
        $locationCount = Location::count();
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));

        $this->patchJson("/api/v1/admin/city-proposals/{$proposal->id}", [
            'action' => 'approve',
            'name_en' => '  OMDURMAN  ',
        ])->assertUnprocessable()->assertJsonValidationErrors('name_en');

        $this->assertSame($locationCount, Location::count());
        $this->assertNull($profile->fresh()->location_id);
        $this->assertSame('pending', $proposal->fresh()->status->value);

        $this->patchJson("/api/v1/admin/city-proposals/{$proposal->id}", [
            'action' => 'map',
            'location_id' => $omdurman->id,
        ])->assertOk();

        $this->assertSame($locationCount, Location::count());
        $this->assertSame($omdurman->id, $profile->fresh()->location_id);
    }

    public function test_provider_verification_is_blocked_until_city_is_resolved(): void
    {
        $this->postJson('/api/v1/auth/register/doctor', $this->registrationPayload(['proposed_city' => 'Unknown City']))->assertCreated();
        $profile = DoctorProfile::query()->firstOrFail();
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));

        $this->patchJson("/api/v1/admin/providers/{$profile->id}/verification", ['status' => 'verified'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
        $this->assertSame('pending_documents', $profile->fresh()->verification_status);
    }

    public function test_rejected_city_remains_hidden_and_unauthorized_users_cannot_manage_reference_data(): void
    {
        $this->postJson('/api/v1/auth/register/doctor', $this->registrationPayload(['proposed_city' => 'Invalid City']))->assertCreated();
        $proposal = CityProposal::query()->firstOrFail();
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/v1/admin/city-proposals/{$proposal->id}", ['action' => 'reject'])->assertOk();
        $this->assertDatabaseMissing('locations', ['normalized_name' => 'invalid city']);

        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);
        $this->getJson('/api/v1/patient/doctor-filters')->assertJsonMissing(['name_en' => 'Invalid City']);
        $this->getJson('/api/v1/admin/providers')->assertForbidden();
        $this->patchJson('/api/v1/admin/locations/1', ['is_active' => false])->assertForbidden();
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

    private function registrationPayload(array $locationChoice): array
    {
        return [
            'first_name' => 'New',
            'last_name' => 'Doctor',
            'email' => 'new.doctor@example.com',
            'phone' => '+249111222333',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
            'specialization' => 'general_medicine',
            'clinic_name' => 'Care Clinic',
            'profile_photo' => UploadedFile::fake()->createWithContent('doctor.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=')),
            ...$locationChoice,
        ];
    }
}
