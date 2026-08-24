<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\ReplaceScheduleRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();

        return response()->json(['data' => ['periods' => $profile->schedules()->orderBy('day_of_week')->orderBy('start_time')->get(), 'exceptions' => $profile->exceptions()->orderBy('exception_date')->get()]]);
    }

    public function replace(ReplaceScheduleRequest $request): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        DB::transaction(function () use ($profile, $request) {
            $profile->schedules()->delete();
            $profile->schedules()->createMany(collect($request->validated('periods'))->map(fn ($period) => [...$period, 'is_active' => $period['is_active'] ?? true])->all());
        });

        return $this->index($request);
    }
}
