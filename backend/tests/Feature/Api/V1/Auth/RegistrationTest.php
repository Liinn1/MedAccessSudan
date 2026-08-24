<?php

namespace Tests\Feature\Api\V1\Auth;

use Tests\TestCase;

class RegistrationTest extends TestCase
{
    public function test_registration_requires_all_patient_identity_fields(): void
    {
        $this->postJson('/api/v1/auth/register')
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'first_name',
                'last_name',
                'email',
                'phone',
                'password',
            ]);
    }
}
