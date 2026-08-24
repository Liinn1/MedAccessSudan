<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Models\DoctorProfile;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfilePhotoManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config()->set('medaccess.demo_auto_verify_doctors', true);
    }

    public function test_patient_registration_succeeds_without_a_picture(): void
    {
        $this->withHeader('Accept', 'application/json')->post('/api/v1/auth/register', $this->patientPayload())
            ->assertCreated()
            ->assertJsonPath('data.user.profile_image_url', null);
        $this->assertNull(User::query()->firstOrFail()->profile_image_path);
    }

    public function test_patient_registration_accepts_a_valid_picture_and_rejects_invalid_content(): void
    {
        $this->withHeader('Accept', 'application/json')->post('/api/v1/auth/register', [
            ...$this->patientPayload(),
            'profile_photo' => $this->validPhoto('patient.png'),
        ])->assertCreated()->assertJsonPath('data.user.profile_image_url', fn ($url) => is_string($url) && str_contains($url, '/storage/profile-photos/patients/'));

        $storedPath = User::query()->firstOrFail()->profile_image_path;
        $this->assertIsString($storedPath);
        Storage::disk('public')->assertExists($storedPath);

        $this->withHeader('Accept', 'application/json')->post('/api/v1/auth/register', [
            ...$this->patientPayload('other@example.com', '+249111222334'),
            'profile_photo' => UploadedFile::fake()->create('document.pdf', 20, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('profile_photo');
    }

    public function test_doctor_picture_is_required_and_validated_during_registration(): void
    {
        $this->withHeader('Accept', 'application/json')->post('/api/v1/auth/register/doctor', $this->doctorPayload())
            ->assertUnprocessable()->assertJsonValidationErrors('profile_photo');

        $this->withHeader('Accept', 'application/json')->post('/api/v1/auth/register/doctor', [
            ...$this->doctorPayload(),
            'profile_photo' => UploadedFile::fake()->create('document.pdf', 20, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('profile_photo');

        $this->withHeader('Accept', 'application/json')->post('/api/v1/auth/register/doctor', [
            ...$this->doctorPayload(),
            'profile_photo' => $this->validPhoto('doctor.png'),
        ])->assertCreated();

        $profile = DoctorProfile::query()->firstOrFail();
        $this->assertSame('verified', $profile->verification_status);
        $this->assertStringStartsWith('profile-photos/doctors/', $profile->profile_image_path);
        Storage::disk('public')->assertExists($profile->profile_image_path);
    }

    public function test_patient_can_replace_and_remove_only_their_own_picture(): void
    {
        $oldPath = 'profile-photos/patients/old.png';
        Storage::disk('public')->put($oldPath, 'old');
        $patient = User::factory()->create(['role' => UserRole::Patient, 'profile_image_path' => $oldPath]);
        $other = User::factory()->create(['role' => UserRole::Patient, 'profile_image_path' => 'profile-photos/patients/other.png']);
        Sanctum::actingAs($patient);

        $this->withHeader('Accept', 'application/json')->post('/api/v1/patient/profile-photo', ['profile_photo' => $this->validPhoto('new.png')])
            ->assertOk()->assertJsonPath('data.user.profile_image_url', fn ($url) => str_contains($url, '/storage/profile-photos/patients/'));
        $newPath = $patient->fresh()->profile_image_path;
        $this->assertNotSame($oldPath, $newPath);
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($newPath);
        $this->assertSame('profile-photos/patients/other.png', $other->fresh()->profile_image_path);

        $this->deleteJson('/api/v1/patient/profile-photo')->assertOk()->assertJsonPath('data.user.profile_image_url', null);
        Storage::disk('public')->assertMissing($newPath);
    }

    public function test_doctor_can_replace_only_their_own_picture_and_patient_cannot_use_doctor_endpoint(): void
    {
        $doctor = $this->doctor('profile-photos/doctors/old.png');
        $otherDoctor = $this->doctor('profile-photos/doctors/other.png', 'other-doctor@example.com');
        Storage::disk('public')->put($doctor->doctorProfile->profile_image_path, 'old');
        Sanctum::actingAs($doctor);

        $this->withHeader('Accept', 'application/json')->post('/api/v1/doctor/profile-photo', ['profile_photo' => $this->validPhoto('replacement.png')])
            ->assertOk()->assertJsonPath('data.profile_image_url', fn ($url) => str_contains($url, '/storage/profile-photos/doctors/'));
        $this->assertNotSame('profile-photos/doctors/old.png', $doctor->doctorProfile->fresh()->profile_image_path);
        $this->assertSame('profile-photos/doctors/other.png', $otherDoctor->doctorProfile->fresh()->profile_image_path);

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient]));
        $this->getJson("/api/v1/patient/doctors/{$doctor->doctorProfile->id}")
            ->assertOk()
            ->assertJsonPath('data.profile_image_url', fn ($url) => is_string($url) && str_contains($url, '/storage/profile-photos/doctors/'));
        $this->postJson('/api/v1/doctor/profile-photo')->assertForbidden();
    }

    private function patientPayload(string $email = 'patient@example.com', string $phone = '+249111222333'): array
    {
        return ['first_name' => 'Amira', 'last_name' => 'Ali', 'email' => $email, 'phone' => $phone, 'password' => 'Secure123', 'password_confirmation' => 'Secure123'];
    }

    private function doctorPayload(): array
    {
        return [...$this->patientPayload('doctor@example.com', '+249111222335'), 'specialization' => 'general_medicine', 'location' => 'khartoum'];
    }

    private function validPhoto(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII='));
    }

    private function doctor(string $path, string $email = 'doctor-one@example.com'): User
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor, 'email' => $email]);
        DoctorProfile::create(['user_id' => $doctor->id, 'specialization_id' => Specialization::query()->firstOrFail()->id, 'location_id' => Location::query()->firstOrFail()->id, 'verification_status' => 'verified', 'profile_image_path' => $path]);

        return $doctor;
    }
}
