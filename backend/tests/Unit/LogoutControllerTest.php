<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\V1\Auth\LogoutController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class LogoutControllerTest extends TestCase
{
    public function test_logout_invalidates_the_session_and_rotates_the_csrf_token(): void
    {
        Auth::shouldReceive('guard')->once()->with('web')->andReturnSelf();
        Auth::shouldReceive('logout')->once();

        $session = $this->app['session']->driver();
        $session->start();
        $session->put('authenticated_marker', true);
        $session->regenerateToken();
        $oldToken = $session->token();

        $request = Request::create('/api/v1/auth/logout', 'POST');
        $request->setLaravelSession($session);

        $response = (new LogoutController)($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertFalse($session->has('authenticated_marker'));
        $this->assertNotSame($oldToken, $session->token());
    }
}
