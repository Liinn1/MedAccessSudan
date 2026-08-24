<?php

namespace Tests\Feature\Api\V1\Patient;

use Tests\TestCase;

class DoctorSearchTest extends TestCase
{
    public function test_doctor_filter_catalog_requires_authentication(): void
    {
        $this->getJson('/api/v1/patient/doctor-filters')->assertUnauthorized();
    }

    public function test_doctor_search_requires_authentication(): void
    {
        $this->getJson('/api/v1/patient/doctors?specialization=cardiology&location=khartoum&availability=today')
            ->assertUnauthorized();
    }

    public function test_doctor_profile_requires_authentication(): void
    {
        $this->getJson('/api/v1/patient/doctors/1')->assertUnauthorized();
    }
}
