<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\UserRole;
use App\Models\Location;
use App\Models\User;
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
        config()->set('medaccess.demo_auto_verify_doctors', false);
    }

    public function test_registration_options_expose_the_supported_sudan_cities(): void
    {
        $response = $this->getJson('/api/v1/auth/doctor-registration-options')->assertOk();
        $response->assertJsonCount(26, 'data.locations')
            ->assertJsonFragment(['code' => 'SD-KH', 'name_en' => 'Khartoum', 'name_ar' => 'الخرطوم'])
            ->assertJsonFragment(['code' => 'city-omdurman', 'name_en' => 'Omdurman', 'name_ar' => 'أم درمان'])
            ->assertJsonFragment(['code' => 'city-bahri', 'name_en' => 'Khartoum North / Bahri', 'name_ar' => 'بحري']);
        $this->assertSame(26, Location::query()->count());
        $this->assertSame(26, Location::query()->distinct('code')->count('code'));
    }

    public function test_doctor_registration_persists_canonical_city_and_detailed_address(): void
    {
        $this->postJson('/api/v1/auth/register/doctor', $this->registrationPayload())->assertCreated();
        $doctor = User::query()->where('email', 'new.doctor@example.com')->firstOrFail();
        $this->assertSame('SD-KH', $doctor->doctorProfile->location->code);
        $this->assertSame('Omdurman, Al-Thawra, Block 10', $doctor->doctorProfile->address);
    }

    public function test_retired_city_proposal_routes_are_not_available(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));
        $this->getJson('/api/v1/admin/city-proposals')->assertNotFound();
        $this->patchJson('/api/v1/admin/city-proposals/1', ['action' => 'approve'])->assertNotFound();
    }

    private function registrationPayload(): array
    {
        return [
            'first_name' => 'New', 'last_name' => 'Doctor',
            'email' => 'new.doctor@example.com', 'phone' => '+249111222333',
            'password' => 'Secure123', 'password_confirmation' => 'Secure123',
            'specialization' => 'general_medicine', 'location' => 'SD-KH',
            'address' => 'Omdurman, Al-Thawra, Block 10', 'clinic_name' => 'Care Clinic',
            'offers_clinic_visits' => true, 'offers_home_visits' => false,
            'profile_photo' => UploadedFile::fake()->createWithContent('doctor.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=')),
        ];
    }
}
