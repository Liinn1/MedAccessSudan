<?php

namespace Tests\Feature\Api\V1\Patient;

use App\Enums\UserRole;
use App\Models\DoctorAvailabilitySchedule;
use App\Models\DoctorProfile;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DoctorSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('medaccess.demo_auto_verify_doctors', false);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_doctor_filter_catalog_requires_authentication(): void
    {
        $this->getJson('/api/v1/patient/doctor-filters')->assertUnauthorized();
    }

    public function test_doctor_search_requires_authentication(): void
    {
        $this->getJson('/api/v1/patient/doctors?specialization=cardiology&location=khartoum&availability=today')
            ->assertUnauthorized();
    }

    public function test_doctor_profile_requires_authentication(): void
    {
        $this->getJson('/api/v1/patient/doctors/1')->assertUnauthorized();
    }

    public function test_demo_approved_neurologist_is_returned_by_canonical_specialty_without_optional_filters(): void
    {
        CarbonImmutable::setTestNow('2026-08-24 19:00:00 Africa/Khartoum');
        config()->set('medaccess.demo_auto_verify_doctors', true);
        $doctor = $this->createDoctor('neurology', 'khartoum', 'pending');
        $this->addSchedule($doctor, 2);
        $this->authenticatePatient();

        $this->getJson('/api/v1/patient/doctors?specialization=neurology')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.doctors.0.specialization.code', 'neurology')
            ->assertJsonPath('data.doctors.0.location.code', 'khartoum');

        $this->getJson('/api/v1/patient/doctors?specialization=Neurologist')->assertUnprocessable();
    }

    public function test_location_is_an_optional_canonical_filter(): void
    {
        $this->createDoctor('neurology', 'khartoum');
        $this->authenticatePatient();

        $this->getJson('/api/v1/patient/doctors?specialization=neurology&location=khartoum')
            ->assertOk()->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/patient/doctors?specialization=neurology&location=bahri')
            ->assertOk()->assertJsonPath('meta.total', 0);
    }

    public function test_availability_filter_uses_carbon_sunday_zero_mapping_and_is_optional(): void
    {
        CarbonImmutable::setTestNow('2026-08-30 08:00:00 Africa/Khartoum');
        $doctor = $this->createDoctor('neurology', 'khartoum');
        $this->addSchedule($doctor, 0);
        $this->authenticatePatient();

        $this->getJson('/api/v1/patient/doctors?specialization=neurology&availability=today')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.doctors.0.next_available_at', '2026-08-30T09:00:00+02:00');
    }

    public function test_unavailable_date_does_not_remove_doctor_from_specialty_only_search(): void
    {
        CarbonImmutable::setTestNow('2026-08-24 08:00:00 Africa/Khartoum');
        $doctor = $this->createDoctor('neurology', 'khartoum');
        $this->addSchedule($doctor, 2);
        $this->authenticatePatient();

        $this->getJson('/api/v1/patient/doctors?specialization=neurology&availability=today')
            ->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/v1/patient/doctors?specialization=neurology')
            ->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_production_pending_and_suspended_doctors_are_excluded(): void
    {
        $this->createDoctor('neurology', 'khartoum', 'pending');
        $this->createDoctor('neurology', 'khartoum', 'suspended');
        $this->createDoctor('neurology', 'khartoum', 'verified');
        $this->authenticatePatient();

        $this->getJson('/api/v1/patient/doctors?specialization=neurology')
            ->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_inactive_reference_data_and_different_specialties_are_excluded(): void
    {
        $neurologist = $this->createDoctor('neurology', 'khartoum');
        $this->createDoctor('cardiology', 'khartoum');
        $this->authenticatePatient();

        $this->getJson('/api/v1/patient/doctors?specialization=cardiology')
            ->assertOk()->assertJsonPath('meta.total', 1);

        $neurologist->specialization->update(['is_active' => false]);
        $this->getJson('/api/v1/patient/doctors?location=khartoum')
            ->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_empty_optional_filters_do_not_become_constraints(): void
    {
        $this->createDoctor('neurology', 'khartoum');
        $this->authenticatePatient();

        $this->getJson('/api/v1/patient/doctors?specialization=&location=&availability=')
            ->assertOk()->assertJsonPath('meta.total', 1);
    }

    private function authenticatePatient(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient]));
    }

    private function createDoctor(string $specializationCode, string $locationCode, string $status = 'verified'): DoctorProfile
    {
        return DoctorProfile::create([
            'user_id' => User::factory()->create(['role' => UserRole::Doctor])->id,
            'specialization_id' => Specialization::query()->where('code', $specializationCode)->valueOrFail('id'),
            'location_id' => Location::query()->where('code', $locationCode)->valueOrFail('id'),
            'clinic_name' => 'Test Clinic',
            'profile_image_path' => null,
            'verification_status' => $status,
        ]);
    }

    private function addSchedule(DoctorProfile $doctor, int $dayOfWeek): void
    {
        DoctorAvailabilitySchedule::create([
            'doctor_profile_id' => $doctor->id,
            'day_of_week' => $dayOfWeek,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'slot_duration_minutes' => 30,
            'is_active' => true,
        ]);
    }
}
