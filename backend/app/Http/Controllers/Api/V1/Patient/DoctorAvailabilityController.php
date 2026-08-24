<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use App\Models\DoctorProfile;
use App\Services\AvailabilityResolver;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorAvailabilityController extends Controller
{
    public function __invoke(Request $request, DoctorProfile $doctor, AvailabilityResolver $resolver): JsonResponse
    {
        $validated = $request->validate(['from' => ['nullable', 'date_format:Y-m-d'], 'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from']]);
        $from = CarbonImmutable::parse($validated['from'] ?? now()->toDateString(), config('app.timezone'))->startOfDay();
        $to = CarbonImmutable::parse($validated['to'] ?? $from->addDays(13)->toDateString(), config('app.timezone'))->startOfDay();
        abort_unless(DoctorProfile::query()->bookable()->whereKey($doctor->id)->exists(), 404);

        return response()->json(['data' => ['doctor_id' => $doctor->id, 'timezone' => config('app.timezone'), 'dates' => $resolver->resolve($doctor, $from, $to)]]);
    }
}
