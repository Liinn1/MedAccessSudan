<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Enums\AppointmentServiceType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\ReplaceScheduleRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        $consultationType = $this->consultationTypeFromRequest($request);

        $schedules = $profile->schedules()->orderBy('day_of_week')->orderBy('start_time');
        $exceptions = $profile->exceptions()->orderBy('exception_date');
        if ($consultationType) {
            $schedules->where('consultation_type', $consultationType->value);
            $exceptions->where('consultation_type', $consultationType->value);
        }

        return response()->json(['data' => [
            'offers_clinic_visits' => (bool) $profile->offers_clinic_visits,
            'offers_home_visits' => (bool) $profile->offers_home_visits,
            'periods' => $schedules->get(),
            'exceptions' => $exceptions->get(),
        ]]);
    }

    public function replace(ReplaceScheduleRequest $request): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        $consultationType = AppointmentServiceType::from($request->validated('consultation_type'));
        abort_unless($profile->offers($consultationType), 422, 'This consultation type is not enabled on the professional profile.');

        DB::transaction(function () use ($profile, $request, $consultationType) {
            $profile->schedules()->where('consultation_type', $consultationType->value)->delete();
            $profile->schedules()->createMany(collect($request->validated('periods'))->map(fn ($period) => [
                ...$period,
                'consultation_type' => $consultationType->value,
                'is_active' => $period['is_active'] ?? true,
            ])->all());
        });

        $request->merge(['consultation_type' => $consultationType->value]);

        return $this->index($request);
    }

    private function consultationTypeFromRequest(Request $request): ?AppointmentServiceType
    {
        $validated = $request->validate([
            'consultation_type' => ['sometimes', 'nullable', Rule::enum(AppointmentServiceType::class)],
        ]);

        return isset($validated['consultation_type'])
            ? AppointmentServiceType::from($validated['consultation_type'])
            : null;
    }
}
