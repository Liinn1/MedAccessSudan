<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Enums\AppointmentServiceType;
use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Patient\BookAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Services\AvailabilityResolver;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        return AppointmentResource::collection(Appointment::with(['doctorProfile.user', 'doctorProfile.specialization', 'doctorProfile.location'])->where('patient_id', $request->user()->id)->orderBy('starts_at')->get());
    }

    public function store(BookAppointmentRequest $request, AvailabilityResolver $resolver): JsonResponse
    {
        $data = $request->validated();
        $requested = CarbonImmutable::parse($data['starts_at'], config('app.timezone'))->startOfMinute();
        try {
            $appointment = DB::transaction(function () use ($request, $resolver, $data, $requested) {
                $doctor = DoctorProfile::query()->bookable()->lockForUpdate()->findOrFail($data['doctor_profile_id']);
                $slots = collect($resolver->resolve($doctor, $requested->startOfDay(), $requested->startOfDay()))->flatMap(fn ($day) => $day['slots']);
                $slot = $slots->first(fn ($candidate) => CarbonImmutable::parse($candidate['starts_at'])->equalTo($requested));
                abort_unless($slot, 409, 'The selected appointment time is no longer available.');

                return Appointment::create(['patient_id' => $request->user()->id, 'doctor_profile_id' => $doctor->id, 'starts_at' => $requested, 'ends_at' => CarbonImmutable::parse($slot['ends_at']), 'status' => AppointmentStatus::Confirmed, 'service_type' => AppointmentServiceType::Clinic, 'notes' => $data['notes'] ?? null]);
            }, 3);
        } catch (QueryException $error) {
            if (in_array($error->getCode(), ['23000', '23505'], true)) {
                return response()->json(['message' => 'The selected appointment time is no longer available.', 'code' => 'SLOT_UNAVAILABLE'], 409);
            }
            throw $error;
        }

        return (new AppointmentResource($appointment->load(['doctorProfile.user', 'doctorProfile.specialization', 'doctorProfile.location'])))->response()->setStatusCode(201);
    }
}
