<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Enums\AppointmentServiceType;
use App\Http\Controllers\Controller;
use App\Services\AvailabilityResolver;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ResolvedAvailabilityController extends Controller
{
    public function __invoke(Request $request, AvailabilityResolver $resolver): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        $validated = $request->validate([
            'consultation_type' => ['sometimes', 'nullable', Rule::enum(AppointmentServiceType::class)],
        ]);
        $type = isset($validated['consultation_type'])
            ? AppointmentServiceType::from($validated['consultation_type'])
            : null;
        $from = CarbonImmutable::today(config('app.timezone'));

        return response()->json(['data' => [
            'timezone' => config('app.timezone'),
            'dates' => $resolver->resolve($profile, $from, $from->addDays(13), $type),
        ]]);
    }
}
