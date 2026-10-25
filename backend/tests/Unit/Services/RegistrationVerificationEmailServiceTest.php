<?php

namespace Tests\Unit\Services;

use App\Models\User;
use App\Services\RegistrationVerificationEmailService;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class RegistrationVerificationEmailServiceTest extends TestCase
{
    public function test_it_reports_success_when_the_verification_notification_is_sent(): void
    {
        $user = Mockery::mock(User::class);
        $user->shouldReceive('sendEmailVerificationNotification')->once();

        $this->assertTrue(app(RegistrationVerificationEmailService::class)->send($user));
    }

    public function test_it_reports_failure_without_rethrowing_mail_transport_errors(): void
    {
        $user = Mockery::mock(User::class);
        $user->shouldReceive('sendEmailVerificationNotification')
            ->once()
            ->andThrow(new RuntimeException('Simulated mail transport failure.'));

        $this->assertFalse(app(RegistrationVerificationEmailService::class)->send($user));
    }
}
