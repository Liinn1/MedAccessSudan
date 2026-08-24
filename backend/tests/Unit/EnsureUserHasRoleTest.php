<?php

namespace Tests\Unit;

use App\Enums\UserRole;
use App\Http\Middleware\EnsureUserHasRole;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class EnsureUserHasRoleTest extends TestCase
{
    public function test_patient_role_can_continue_to_patient_resource(): void
    {
        $request = Request::create('/api/v1/patient/home');
        $request->setUserResolver(fn () => new User(['role' => UserRole::Patient]));

        $response = (new EnsureUserHasRole)->handle(
            $request,
            fn () => response()->json(['allowed' => true]),
            'patient',
        );

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }

    public function test_non_patient_role_is_forbidden_from_patient_resource(): void
    {
        $request = Request::create('/api/v1/patient/home');
        $request->setUserResolver(fn () => new User(['role' => UserRole::Doctor]));

        $response = (new EnsureUserHasRole)->handle(
            $request,
            fn () => response()->json(['allowed' => true]),
            'patient',
        );

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());
        $this->assertSame('FORBIDDEN_ROLE', $response->getData(true)['code']);
    }
}
