<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Patient\StoreDoctorReviewRequest;
use App\Http\Resources\DoctorReviewResource;
use App\Models\Appointment;
use App\Models\DoctorReview;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;

class DoctorReviewController extends Controller
{
    public function store(StoreDoctorReviewRequest $request, int $appointment): JsonResponse
    {
        $record = Appointment::where('patient_id', $request->user()->id)->findOrFail($appointment);
        abort_unless($record->status === AppointmentStatus::Completed, 409, 'Only completed appointments can be reviewed.');
        abort_if($record->review()->exists(), 409, 'This appointment has already been reviewed.');
        $data = $request->validated();

        try {
            $review = DoctorReview::create([
                'appointment_id' => $record->id,
                'patient_id' => $request->user()->id,
                'doctor_profile_id' => $record->doctor_profile_id,
                'rating' => $data['rating'],
                'comment' => isset($data['comment']) ? trim($data['comment']) ?: null : null,
            ]);
        } catch (QueryException $error) {
            if (in_array($error->getCode(), ['23000', '23505'], true)) {
                abort(409, 'This appointment has already been reviewed.');
            }
            throw $error;
        }

        return (new DoctorReviewResource($review))->response()->setStatusCode(201);
    }
}
