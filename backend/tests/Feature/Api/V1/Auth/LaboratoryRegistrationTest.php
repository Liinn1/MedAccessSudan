<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Models\User;
use App\Services\RegistrationVerificationEmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LaboratoryRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void { parent::setUp(); Storage::fake('public'); }

    public function test_laboratory_registration_requires_city_and_detailed_address(): void
    {
        $this->postJson('/api/v1/auth/register/laboratory')->assertUnprocessable()
            ->assertJsonValidationErrors(['laboratory_name', 'email', 'phone', 'password', 'address', 'location', 'supports_at_lab', 'supports_home_collection']);
    }

    public function test_invalid_city_code_is_rejected(): void
    {
        $this->postJson('/api/v1/auth/register/laboratory', $this->payload(['location' => 'not-a-city']))
            ->assertUnprocessable()->assertJsonValidationErrors(['location']);
    }

    public function test_laboratory_registration_persists_city_address_and_service_modes(): void
    {
        $payload = $this->payload();
        $this->postJson('/api/v1/auth/register/laboratory', $payload)
            ->assertCreated()
            ->assertJsonPath('data.user.role', 'laboratory')
            ->assertJsonPath('account_created', true)
            ->assertJsonPath('verification_email_sent', true);
        $lab = User::query()->where('email', $payload['email'])->firstOrFail();
        $this->assertSame(UserRole::Laboratory, $lab->role);
        $this->assertTrue(Hash::check($payload['password'], $lab->password));
        $this->assertSame('SD-GZ', $lab->laboratoryProfile->location->code);
        $this->assertSame($payload['address'], $lab->laboratoryProfile->address);
        $this->assertSame('pending_documents', $lab->laboratoryProfile->verification_status);
        $this->assertTrue($lab->laboratoryProfile->supports_at_lab);
        $this->assertTrue($lab->laboratoryProfile->supports_home_collection);
    }

    public function test_laboratory_registration_rejects_duplicate_email_and_phone(): void
    {
        User::factory()->create([
            'email' => 'nile.lab@example.com',
            'phone' => '+249111333444',
        ]);

        $this->postJson('/api/v1/auth/register/laboratory', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'phone'])
            ->assertJsonPath('validation_codes.email.0', 'unique');

        $this->assertSame(1, User::query()->where('email', 'nile.lab@example.com')->count());
    }

    public function test_laboratory_registration_reports_invalid_email_separately_from_duplicate_email(): void
    {
        $this->postJson('/api/v1/auth/register/laboratory', $this->payload([
            'email' => 'not-an-email',
            'phone' => '+249111333445',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('validation_codes.email.0', 'email');
    }

    public function test_laboratory_and_profile_remain_consistent_when_verification_email_delivery_fails(): void
    {
        $this->mock(RegistrationVerificationEmailService::class)
            ->shouldReceive('send')
            ->once()
            ->andReturnFalse();

        $payload = $this->payload([
            'email' => 'mail.failure.lab@example.com',
            'phone' => '+249111333446',
        ]);

        $this->postJson('/api/v1/auth/register/laboratory', $payload)
            ->assertCreated()
            ->assertJsonPath('account_created', true)
            ->assertJsonPath('verification_email_sent', false)
            ->assertJsonPath('code', 'ACCOUNT_CREATED_BUT_VERIFICATION_EMAIL_FAILED');

        $laboratory = User::query()->where('email', $payload['email'])->firstOrFail();
        $this->assertNull($laboratory->email_verified_at);
        $this->assertSame('pending_documents', $laboratory->laboratoryProfile->verification_status);
    }

    public function test_laboratory_requires_at_least_one_service_mode(): void
    {
        $this->postJson('/api/v1/auth/register/laboratory', $this->payload(['supports_at_lab' => false, 'supports_home_collection' => false]))
            ->assertUnprocessable()->assertJsonValidationErrors(['supports_at_lab']);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'laboratory_name' => 'Nile Diagnostics', 'email' => 'nile.lab@example.com',
            'phone' => '+249111333444', 'password' => 'Secure123', 'password_confirmation' => 'Secure123',
            'location' => 'SD-GZ', 'address' => 'Wad Madani, Market Street, Building 12',
            'supports_at_lab' => true, 'supports_home_collection' => true,
            'profile_photo' => UploadedFile::fake()->createWithContent('lab.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=')),
        ], $overrides);
    }
}
