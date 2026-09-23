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

    public function test_successful_doctor_login_returns_the_authenticated_doctor_role(): void
    {
        $user = new User([
            'name' => 'Test Doctor',
            'email' => 'doctor@example.com',
            'role' => UserRole::Doctor,
            'is_active' => true,
        ]);
        $user->id = 2;

        Auth::shouldReceive('guard')->with('web')->andReturnSelf();
        Auth::shouldReceive('attempt')->once()->andReturnTrue();
        Auth::shouldReceive('user')->once()->andReturn($user);

        $request = LoginRequest::create('/api/v1/auth/login', 'POST', [
            'identifier' => 'doctor@example.com',
            'password' => 'secure-password',
        ]);
        $request->setLaravelSession($this->app['session']->driver());

        $response = (new LoginController)($request);
        $responseData = $response->getData(true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('doctor', $responseData['data']['user']['role']);
    }

    public function test_administrative_accounts_cannot_use_the_public_login_endpoint(): void
    {
        $user = new User([
            'name' => 'Test Admin',
            'email' => 'admin@example.com',
            'role' => UserRole::Admin,
            'is_active' => true,
        ]);
        $user->id = 3;

        Auth::shouldReceive('guard')->with('web')->andReturnSelf();
        Auth::shouldReceive('attempt')->once()->andReturnTrue();
        Auth::shouldReceive('user')->once()->andReturn($user);
        Auth::shouldReceive('logout')->once();

        $request = LoginRequest::create('/api/v1/auth/login', 'POST', [
            'identifier' => 'admin@example.com',
            'password' => 'secure-password',
        ]);
        $request->setLaravelSession($this->app['session']->driver());

        $response = (new LoginController)($request);

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('INVALID_CREDENTIALS', $response->getData(true)['code']);
    }

    public function test_inactive_accounts_are_rejected_after_credentials_match(): void
    {
        $user = new User([
            'name' => 'Inactive Patient',
            'email' => 'inactive@example.com',
            'role' => UserRole::Patient,
            'is_active' => false,
        ]);

        Auth::shouldReceive('guard')->with('web')->andReturnSelf();
        Auth::shouldReceive('attempt')->once()->andReturnTrue();
        Auth::shouldReceive('user')->once()->andReturn($user);
        Auth::shouldReceive('logout')->once();

        $request = LoginRequest::create('/api/v1/auth/login', 'POST', [
            'identifier' => 'inactive@example.com',
            'password' => 'secure-password',
        ]);
        $request->setLaravelSession($this->app['session']->driver());

        $response = (new LoginController)($request);

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('INVALID_CREDENTIALS', $response->getData(true)['code']);
    }
}
