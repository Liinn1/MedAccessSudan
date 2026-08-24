<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class LoginTest extends TestCase
{
    public function test_login_requires_an_identifier_and_password(): void
    {
        $this->postJson('/api/v1/auth/login')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['identifier', 'password']);
    }

    public function test_invalid_credentials_return_a_safe_generic_error(): void
    {
        Auth::shouldReceive('guard')->with('web')->andReturnSelf();
        Auth::shouldReceive('attempt')->once()->andReturnFalse();

        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'patient@example.com',
            'password' => 'incorrect-password',
        ])->assertUnprocessable()
            ->assertJson([
                'code' => 'INVALID_CREDENTIALS',
            ]);
    }

    public function test_successful_login_regenerates_the_session_and_returns_safe_user_data(): void
    {
        $user = new User([
            'name' => 'Test Patient',
            'email' => 'patient@example.com',
            'phone' => '+249111111111',
            'role' => UserRole::Patient,
        ]);
        $user->id = 1;

        Auth::shouldReceive('guard')->with('web')->andReturnSelf();
        Auth::shouldReceive('attempt')
            ->once()
            ->with([
                'email' => 'patient@example.com',
                'password' => 'secure-password',
            ])
            ->andReturnTrue();
        Auth::shouldReceive('user')->once()->andReturn($user);

        $request = LoginRequest::create('/api/v1/auth/login', 'POST', [
            'identifier' => 'PATIENT@example.com',
            'password' => 'secure-password',
        ]);
        $request->setLaravelSession($this->app['session']->driver());

        $response = (new LoginController)($request);
        $responseData = $response->getData(true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('patient', $responseData['data']['user']['role']);
        $this->assertArrayNotHasKey('password', $responseData['data']['user']);
    }

    public function test_protected_identity_endpoint_rejects_an_unauthenticated_request(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }
}
