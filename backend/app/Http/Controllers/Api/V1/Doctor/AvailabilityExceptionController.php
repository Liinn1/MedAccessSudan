<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\StoreAvailabilityExceptionRequest;
use App\Models\DoctorAvailabilityException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityExceptionController extends Controller
{
    public function store(StoreAvailabilityExceptionRequest $request): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        $this->ensureNoConflict($profile->exceptions(), $request->validated());
        $exception = $profile->exceptions()->create($request->validated());

        return response()->json(['data' => $exception], 201);
    }

    public function update(StoreAvailabilityExceptionRequest $request, DoctorAvailabilityException $exception): JsonResponse
    {
        $this->ensureOwned($request, $exception);
        $this->ensureNoConflict($request->user()->doctorProfile->exceptions()->whereKeyNot($exception->id), $request->validated());
        $exception->update($request->validated());

        return response()->json(['data' => $exception->fresh()]);
    }

    public function destroy(Request $request, DoctorAvailabilityException $exception): JsonResponse
    {
        $this->ensureOwned($request, $exception);
        abort_if($exception->exception_date->isPast(), 422, 'Past exceptions cannot be removed.');
        $exception->delete();

        return response()->json(null, 204);
    }

    private function ensureOwned(Request $request, DoctorAvailabilityException $exception): void
    {
        abort_unless($request->user()->doctorProfile()->whereKey($exception->doctor_profile_id)->exists(), 404);
    }

    private function ensureNoConflict($query, array $data): void
    {
        $sameDate = (clone $query)->whereDate('exception_date', $data['exception_date']);
        abort_if($data['type'] === 'unavailable' && (clone $sameDate)->exists(), 422, 'An unavailable day cannot contain other exceptions.');
        abort_if($data['type'] !== 'unavailable' && (clone $sameDate)->where('type', 'unavailable')->exists(), 422, 'This date is marked unavailable.');
        if ($data['type'] !== 'unavailable') {
            abort_if((clone $sameDate)->where('type', $data['type'])->where('start_time', '<', $data['end_time'])->where('end_time', '>', $data['start_time'])->exists(), 422, 'Exception time ranges cannot overlap.');
        }
    }
}
