<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        // A lightweight query verifies the full API-to-database path without
        // exposing connection details or reading sensitive application data.
        DB::select('SELECT 1');

        return response()->json([
            'status' => 'ok',
            'service' => 'MedAccess Sudan API',
            'database' => 'connected',
        ]);
    }
}
