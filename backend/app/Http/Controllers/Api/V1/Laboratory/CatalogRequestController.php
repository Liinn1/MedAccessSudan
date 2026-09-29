<?php

namespace App\Http\Controllers\Api\V1\Laboratory;

use App\Enums\LaboratoryCatalogRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Laboratory\StoreLaboratoryCatalogRequestRequest;
use App\Support\LaboratoryAccess;
use Illuminate\Http\JsonResponse;

class CatalogRequestController extends Controller
{
    public function store(StoreLaboratoryCatalogRequestRequest $request): JsonResponse
    {
        $profile = LaboratoryAccess::profile($request->user());
        $data = $request->validated();

        $record = $profile->catalogRequests()->create([
            'requested_by_user_id' => $request->user()->id,
            'suggested_name' => $data['suggested_name'],
            'suggested_lab_test_category_id' => $data['suggested_lab_test_category_id'] ?? null,
            'note' => $data['note'] ?? null,
            'status' => LaboratoryCatalogRequestStatus::Pending,
        ]);

        return response()->json([
            'data' => [
                'id' => $record->id,
                'status' => $record->status->value,
            ],
            'message' => 'Catalog addition request submitted for MedAccess review.',
        ], 201);
    }
}
