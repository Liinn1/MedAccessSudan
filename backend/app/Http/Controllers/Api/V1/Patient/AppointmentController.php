<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Enums\AppointmentServiceType;
use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Patient\BookAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Location;
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
        return AppointmentResource::collection(Appointment::with(['doctorProfile.user', 'doctorProfile.specialization', 'doctorProfile.location', 'review', 'homeVisitDetail.location'])->where('patient_id', $request->user()->id)->orderBy('starts_at')->get());
    }

    public function show(Request $request, int $appointment): AppointmentResource
    {
        $record = Appointment::with(['doctorProfile.user', 'doctorProfile.specialization', 'doctorProfile.location', 'review', 'homeVisitDetail.location'])
            ->where('patient_id', $request->user()->id)
            ->findOrFail($appointment);

        return new AppointmentResource($record);
    }

    public function cancel(Request $request, int $appointment): AppointmentResource
    {
        $record = Appointment::with(['doctorProfile.user', 'doctorProfile.specialization', 'doctorProfile.location'])
            ->where('patient_id', $request->user()->id)
            ->findOrFail($appointment);

        abort_unless($record->status === AppointmentStatus::Confirmed && $record->starts_at->isFuture(), 409, 'This appointment can no longer be cancelled.');

        $record->update(['status' => AppointmentStatus::Cancelled]);

        return new AppointmentResource($record->fresh(['doctorProfile.user', 'doctorProfile.specialization', 'doctorProfile.location']));
    }

    public function store(BookAppointmentRequest $request, AvailabilityResolver $resolver): JsonResponse
    {
        $data = $request->validated();
        $serviceType = AppointmentServiceType::tryFrom($data['service_type'] ?? '') ?? AppointmentServiceType::Clinic;
        $requested = CarbonImmutable::parse($data['starts_at'], config('app.timezone'))->startOfMinute();
        try {
            // Availability shown in the browser can become stale. Resolve it again
            // while holding the doctor row lock before creating the appointment.
            $appointment = DB::transaction(function () use ($request, $resolver, $data, $requested, $serviceType) {
                $doctor = DoctorProfile::query()->bookable()->lockForUpdate()->findOrFail($data['doctor_profile_id']);
                abort_unless($doctor->offers($serviceType), 422, 'The selected doctor does not offer this appointment type.');
                $slots = collect($resolver->resolve($doctor, $requested->startOfDay(), $requested->startOfDay(), $serviceType))->flatMap(fn ($day) => $day['slots']);
                $slot = $slots->first(fn ($candidate) => CarbonImmutable::parse($candidate['starts_at'])->equalTo($requested));
                abort_unless($slot, 409, 'The selected appointment time is no longer available.');

                $appointment = Appointment::create(['patient_id' => $request->user()->id, 'doctor_profile_id' => $doctor->id, 'starts_at' => $requested, 'ends_at' => CarbonImmutable::parse($slot['ends_at']), 'status' => AppointmentStatus::Confirmed, 'service_type' => $serviceType, 'notes' => $data['notes'] ?? null]);
                if ($serviceType === AppointmentServiceType::HomeVisit) {
                    $homeVisit = $data['home_visit'];
                    $city = Location::query()->where('code', $homeVisit['city'])->where('is_active', true)->firstOrFail();
                    abort_unless((int) $doctor->home_visit_location_id === (int) $city->id, 422, 'The selected doctor does not serve this Home Visit city.');
                    unset($homeVisit['city']);
                    $appointment->homeVisitDetail()->create([...$homeVisit, 'location_id' => $city->id]);
                }
                return $appointment;
            }, 3);
        } catch (QueryException $error) {
            // The unique doctor/start-time index is the final concurrency guard
            // when two requests reach the database at nearly the same moment.
            if (in_array($error->getCode(), ['23000', '23505'], true)) {
                return response()->json(['message' => 'The selected appointment time is no longer available.', 'code' => 'SLOT_UNAVAILABLE'], 409);
            }
            throw $error;
        }

        return (new AppointmentResource($appointment->load(['doctorProfile.user', 'doctorProfile.specialization', 'doctorProfile.location', 'homeVisitDetail.location'])))->response()->setStatusCode(201);
    }
}
