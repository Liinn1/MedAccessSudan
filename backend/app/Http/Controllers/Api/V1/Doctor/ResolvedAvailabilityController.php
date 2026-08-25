<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Http\Controllers\Controller;
use App\Services\AvailabilityResolver;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResolvedAvailabilityController extends Controller
{
    public function __invoke(Request $request, AvailabilityResolver $resolver): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        $from = CarbonImmutable::today(config('app.timezone'));

        return response()->json(['data' => [
            'timezone' => config('app.timezone'),
            'dates' => $resolver->resolve($profile, $from, $from->addDays(13)),
        ]]);
    }
}
