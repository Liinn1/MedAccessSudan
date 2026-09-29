<?php

namespace App\Http\Controllers\Api\V1\Laboratory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Laboratory\UpsertLaboratoryOfferingRequest;
use App\Models\LabTest;
use App\Services\LaboratoryActivityLogger;
use App\Support\LaboratoryAccess;
use Illuminate\Http\JsonResponse;

class OfferingController extends Controller
{
    public function __construct(private readonly LaboratoryActivityLogger $activity) {}

    public function upsert(UpsertLaboratoryOfferingRequest $request, LabTest $labTest): JsonResponse
    {
        $profile = LaboratoryAccess::profile($request->user());
        abort_unless($labTest->is_active, 404);

        $data = $request->validated();
        $currency = (string) config('medaccess.laboratory_currency', 'SDG');
        $offering = $profile->offerings()->where('lab_test_id', $labTest->id)->first();
        $wasNew = $offering === null;

        $payload = [
            'price' => $data['price'],
            'currency' => $currency,
            'estimated_turnaround_hours' => $data['estimated_turnaround_hours'],
            'is_available' => $data['is_available'],
        ];

        if ($offering) {
            $offering->update($payload);
        } else {
            $offering = $profile->offerings()->create([
                'lab_test_id' => $labTest->id,
                ...$payload,
            ]);
        }

        $this->activity->record($profile, $request->user(), $wasNew ? 'offering_enabled' : 'offering_updated', [
            'lab_test_id' => $labTest->id,
            'price' => $payload['price'],
            'is_available' => $payload['is_available'],
        ]);

        return response()->json([
            'data' => [
                'id' => $offering->id,
                'lab_test_id' => $offering->lab_test_id,
                'price' => $offering->price,
                'currency' => $offering->currency,
                'estimated_turnaround_hours' => $offering->estimated_turnaround_hours,
                'is_available' => $offering->is_available,
            ],
            'message' => 'Laboratory test offering saved.',
        ]);
    }
}
