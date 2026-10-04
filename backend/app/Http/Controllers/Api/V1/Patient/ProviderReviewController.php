<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Patient\StoreProviderReviewRequest;
use App\Http\Resources\ProviderReviewResource;
use App\Models\Appointment;
use App\Models\LaboratoryOrder;
use App\Models\ProviderReview;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;

class ProviderReviewController extends Controller
{
    public function storeForAppointment(StoreProviderReviewRequest $request, int $appointment): JsonResponse
    {
        $record = Appointment::where('patient_id', $request->user()->id)->findOrFail($appointment);
        abort_unless($record->status === AppointmentStatus::Completed, 409, 'Only completed appointments can be reviewed.');
        abort_if($record->review()->exists(), 409, 'This appointment has already been reviewed.');

        return $this->store($request, [
            'appointment_id' => $record->id,
            'doctor_profile_id' => $record->doctor_profile_id,
        ], 'This appointment has already been reviewed.');
    }

    public function storeForLaboratoryOrder(StoreProviderReviewRequest $request, int $order): JsonResponse
    {
        $record = LaboratoryOrder::where('patient_id', $request->user()->id)->findOrFail($order);
        abort_unless($record->isRateable(), 409, 'Only laboratory requests with a released result can be reviewed.');
        abort_if($record->review()->exists(), 409, 'This laboratory request has already been reviewed.');

        return $this->store($request, [
            'laboratory_order_id' => $record->id,
            'laboratory_profile_id' => $record->laboratory_profile_id,
        ], 'This laboratory request has already been reviewed.');
    }

    /** @param  array<string, int>  $service */
    private function store(StoreProviderReviewRequest $request, array $service, string $duplicateMessage): JsonResponse
    {
        $data = $request->validated();

        try {
            $review = ProviderReview::create([
                ...$service,
                'patient_id' => $request->user()->id,
                'rating' => $data['rating'],
                'comment' => isset($data['comment']) ? trim($data['comment']) ?: null : null,
            ]);
        } catch (QueryException $error) {
            if (in_array($error->getCode(), ['23000', '23505'], true)) {
                abort(409, $duplicateMessage);
            }
            throw $error;
        }

        return (new ProviderReviewResource($review))->response()->setStatusCode(201);
    }
}
