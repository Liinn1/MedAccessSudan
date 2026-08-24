<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_confirms_api_and_database_connectivity(): void
    {
        // The test runtime has no SQLite PDO extension, so the connection is
        // mocked here; the development verification command checks real MySQL.
        DB::shouldReceive('select')
            ->once()
            ->with('SELECT 1')
            ->andReturn([(object) ['1' => 1]]);

        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertExactJson([
                'status' => 'ok',
                'service' => 'MedAccess Sudan API',
                'database' => 'connected',
            ]);
    }
}
