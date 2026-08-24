<?php

namespace Tests\Feature\Api\V1\Auth;

use Tests\TestCase;

class DoctorRegistrationTest extends TestCase
{
    public function test_doctor_registration_requires_identity_and_professional_fields(): void
    {
        $this->postJson('/api/v1/auth/register/doctor')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name', 'last_name', 'email', 'phone', 'password', 'specialization', 'location']);
    }
}
