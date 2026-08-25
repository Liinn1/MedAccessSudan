<?php

namespace Tests\Feature\Api\V1\Doctor;

use App\Enums\UserRole;
use App\Models\DoctorAvailabilitySchedule;
use App\Models\DoctorProfile;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DoctorProfileManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_doctor_can_update_permitted_professional_profile_fields(): void
    {
        $profile = $this->createDoctorProfile();
        Sanctum::actingAs($profile->user);

        $this->putJson('/api/v1/doctor/profile', [
            'clinic_name' => '  Nile Care Clinic  ',
            'biography' => '  Neurology specialist.  ',
            'biography_language' => 'en',
        ])->assertOk()
            ->assertJsonPath('data.profile.clinic_name', 'Nile Care Clinic')
            ->assertJsonPath('data.profile.biography', 'Neurology specialist.')
            ->assertJsonPath('data.profile.biography_language', 'en');

        $this->assertDatabaseHas('doctor_profiles', [
            'id' => $profile->id,
            'biography' => 'Neurology specialist.',
            'biography_language' => 'en',
            'bio_en' => 'Neurology specialist.',
            'bio_ar' => null,
        ]);
    }

    public function test_doctor_cannot_change_controlled_profile_fields(): void
    {
        $profile = $this->createDoctorProfile();
        Sanctum::actingAs($profile->user);

        $this->putJson('/api/v1/doctor/profile', [
            'clinic_name' => 'Clinic',
            'verification_status' => 'verified',
            'specialization_id' => Specialization::query()->latest('id')->firstOrFail()->id,
            'location_id' => Location::query()->latest('id')->firstOrFail()->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['verification_status', 'specialization_id', 'location_id']);

        $this->assertSame('pending', $profile->fresh()->verification_status);
    }

    public function test_patient_cannot_update_a_doctor_profile(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient]));
        $this->putJson('/api/v1/doctor/profile', ['clinic_name' => 'Unauthorized'])->assertForbidden();
    }

    public function test_profile_readiness_data_remains_separate_from_verification(): void
    {
        $profile = $this->createDoctorProfile();
        $profile->update([
            'clinic_name' => 'Complete Clinic',
            'biography' => 'English biography.',
            'biography_language' => 'en',
            'bio_en' => 'English biography.',
            'profile_image_path' => 'profile-photos/doctors/complete.jpg',
        ]);
        DoctorAvailabilitySchedule::create([
            'doctor_profile_id' => $profile->id,
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '12:00',
            'slot_duration_minutes' => 30,
            'is_active' => true,
        ]);
        Sanctum::actingAs($profile->user);

        $this->getJson('/api/v1/doctor/dashboard')
            ->assertOk()
            ->assertJsonPath('data.profile.biography', 'English biography.')
            ->assertJsonPath('data.profile.has_weekly_availability', true)
            ->assertJsonPath('data.profile.verification_status', 'pending');
    }

    public function test_public_biography_uses_cached_translation_and_safely_falls_back_to_original(): void
    {
        $profile = $this->createDoctorProfile();
        $profile->update([
            'biography' => 'English biography.',
            'biography_language' => 'en',
            'bio_en' => 'English biography.',
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient]));

        $this->getJson("/api/v1/patient/doctors/{$profile->id}", ['Accept-Language' => 'ar'])
            ->assertOk()
            ->assertJsonPath('data.biography', 'English biography.')
            ->assertJsonPath('data.biography_language', 'ar')
            ->assertJsonPath('data.biography_is_translated', false);

        $profile->update(['bio_ar' => 'Arabic biography translation.']);

        $this->getJson("/api/v1/patient/doctors/{$profile->id}", ['Accept-Language' => 'ar'])
            ->assertOk()
            ->assertJsonPath('data.biography', 'Arabic biography translation.')
            ->assertJsonPath('data.biography_is_translated', true);
    }

    private function createDoctorProfile(): DoctorProfile
    {
        return DoctorProfile::create([
            'user_id' => User::factory()->create(['role' => UserRole::Doctor])->id,
            'specialization_id' => Specialization::query()->firstOrFail()->id,
            'location_id' => Location::query()->firstOrFail()->id,
            'verification_status' => 'pending',
        ]);
    }
}
