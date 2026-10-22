<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MobileTokenAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_mobile_login_issues_a_sanctum_token_that_can_restore_and_logout(): void
    {
        $user = User::factory()->create([
            'email' => 'mobile.patient@example.com',
            'password' => Hash::make('secure-password'),
            'role' => UserRole::Patient,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $login = $this->postJson('/api/v1/auth/login', [
            'identifier' => $user->email,
            'password' => 'secure-password',
            'device_name' => 'expo-device',
        ])->assertOk()->assertJsonPath('data.user.role', 'patient');

        $token = $login->json('data.token');
        $this->assertIsString($token);
        $this->flushSession();

        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id);

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_web_login_response_does_not_expose_a_token(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('secure-password'),
            'role' => UserRole::Patient,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'identifier' => $user->email,
            'password' => 'secure-password',
        ])->assertOk()->assertJsonMissingPath('data.token');
    }

    public function test_mobile_login_supports_existing_non_administrative_provider_roles(): void
    {
        foreach ([UserRole::Doctor, UserRole::Laboratory] as $role) {
            $user = User::factory()->create([
                'email' => $role->value.'@mobile.example.test',
                'password' => Hash::make('secure-password'),
                'role' => $role,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            $response = $this->postJson('/api/v1/auth/login', [
                'identifier' => $user->email,
                'password' => 'secure-password',
                'device_name' => 'medaccess-expo-mobile',
            ])->assertOk()->assertJsonPath('data.user.role', $role->value);

            $this->assertNotEmpty($response->json('data.token'));
            $this->postJson('/api/v1/auth/logout')->assertOk();
        }
    }

    public function test_mobile_registered_patient_uses_the_same_identity_and_login_contract_as_web(): void
    {
        Notification::fake();
        $payload = [
            'first_name' => 'Mobile',
            'last_name' => 'QA',
            'email' => 'mobile.registration@example.test',
            'phone' => '+249111229999',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
        ];

        $registration = $this->postJson('/api/v1/auth/register', $payload)
            ->assertCreated()
            ->assertJsonPath('data.user.role', 'patient');

        $userId = $registration->json('data.user.id');
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('users', ['id' => $userId, 'email' => $payload['email'], 'role' => UserRole::Patient->value]);

        $this->postJson('/api/v1/auth/register', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'phone']);
        $this->assertDatabaseCount('users', 1);

        $user = User::query()->findOrFail($userId);
        $user->markEmailAsVerified();

        $mobileLogin = $this->postJson('/api/v1/auth/login', [
            'identifier' => $payload['email'],
            'password' => $payload['password'],
            'device_name' => 'medaccess-expo-mobile',
        ])->assertOk()->assertJsonPath('data.user.id', $userId);
        $this->assertNotEmpty($mobileLogin->json('data.token'));

        $this->postJson('/api/v1/auth/logout')->assertOk();
        $this->postJson('/api/v1/auth/login', [
            'identifier' => $payload['email'],
            'password' => $payload['password'],
        ])->assertOk()->assertJsonPath('data.user.id', $userId)->assertJsonMissingPath('data.token');
    }
}
