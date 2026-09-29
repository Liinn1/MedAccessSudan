<?php

namespace App\Http\Controllers\Api\V1\Laboratory;

use App\Enums\LaboratoryOrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Laboratory\UploadLaboratoryResultRequest;
use App\Http\Resources\LaboratoryOrderResource;
use App\Models\LaboratoryOrder;
use App\Services\LaboratoryActivityLogger;
use App\Services\LaboratoryOrderWorkflow;
use App\Services\LaboratoryResultFileService;
use App\Support\LaboratoryAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResultController extends Controller
{
    public function __construct(
        private readonly LaboratoryResultFileService $files,
        private readonly LaboratoryOrderWorkflow $workflow,
        private readonly LaboratoryActivityLogger $activity,
    ) {}

    public function store(UploadLaboratoryResultRequest $request, LaboratoryOrder $order): JsonResponse
    {
        $profile = LaboratoryAccess::profile($request->user());
        abort_unless($order->laboratory_profile_id === $profile->id, 404);

        if (! in_array($order->status, [LaboratoryOrderStatus::InProgress, LaboratoryOrderStatus::ResultReady], true)) {
            return response()->json([
                'message' => 'Results can only be uploaded while processing is in progress.',
                'code' => 'INVALID_STATUS_TRANSITION',
            ], 422);
        }

        try {
            $this->files->store($order, $request->file('result'), $request->user());
        } catch (RuntimeException) {
            return response()->json([
                'message' => 'The result file could not be stored.',
                'code' => 'RESULT_FILE_INVALID',
            ], 422);
        }

        $this->activity->record($profile, $request->user(), $order->status === LaboratoryOrderStatus::ResultReady ? 'result_replaced' : 'result_uploaded', [
            'order_id' => $order->id,
        ]);

        if ($order->status === LaboratoryOrderStatus::InProgress) {
            $this->workflow->transition($order, LaboratoryOrderStatus::ResultReady, $request->user());
        }

        $order->refresh()->load(['patient:id,name,phone', 'items', 'results', 'events']);

        return response()->json([
            'data' => (new LaboratoryOrderResource($order))->resolve(),
            'message' => 'Laboratory result uploaded.',
        ]);
    }

    public function download(Request $request, LaboratoryOrder $order): StreamedResponse
    {
        $profile = LaboratoryAccess::profile($request->user());
        abort_unless($order->laboratory_profile_id === $profile->id, 404);

        $result = $order->latestResult();
        abort_unless($result, 404);

        return $this->files->download($result);
    }
}
