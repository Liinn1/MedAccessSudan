<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateLocationRequest;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use App\Services\AdminAuditService;

class LocationController extends Controller
{
    public function __construct(private readonly AdminAuditService $audit) {}
    public function index(): JsonResponse
    {
        return response()->json(['data' => ['locations' => Location::query()->orderBy('name_en')->get()]]);
    }

    public function update(UpdateLocationRequest $request, Location $location): JsonResponse
    {
        $location->update($request->validated());
        $this->audit->record($request->user(), 'location.status_updated', $location, ['is_active' => $location->is_active]);

        return response()->json(['data' => ['location' => $location->fresh()], 'message' => 'City status updated.']);
    }
}
