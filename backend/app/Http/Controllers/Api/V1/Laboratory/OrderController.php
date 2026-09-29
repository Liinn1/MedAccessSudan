<?php

namespace App\Http\Controllers\Api\V1\Laboratory;

use App\Enums\LaboratoryOrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Laboratory\TransitionLaboratoryOrderRequest;
use App\Http\Resources\LaboratoryOrderResource;
use App\Models\LaboratoryOrder;
use App\Services\LaboratoryOrderWorkflow;
use App\Support\LaboratoryAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private readonly LaboratoryOrderWorkflow $workflow) {}

    public function index(Request $request): JsonResponse
    {
        $profile = LaboratoryAccess::profile($request->user());
        $status = $request->string('status')->toString();
        $search = trim((string) $request->query('q', ''));

        $orders = LaboratoryOrder::query()
            ->where('laboratory_profile_id', $profile->id)
            ->with(['patient:id,name,phone', 'items', 'results', 'events'])
            ->when(
                $status !== '' && $status !== 'all',
                fn ($query) => $query->where('status', $status),
            )
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';
                $query->where(function ($inner) use ($like) {
                    $inner->where('reference', 'like', $like)
                        ->orWhereHas('patient', fn ($patient) => $patient->where('name', 'like', $like));
                });
            })
            ->latest('id')
            ->get();

        return response()->json(['data' => LaboratoryOrderResource::collection($orders)->resolve()]);
    }

    public function show(Request $request, LaboratoryOrder $order): JsonResponse
    {
        $profile = LaboratoryAccess::profile($request->user());
        abort_unless($order->laboratory_profile_id === $profile->id, 404);

        $order->load(['patient:id,name,phone', 'items', 'results', 'events']);

        return response()->json(['data' => (new LaboratoryOrderResource($order))->resolve()]);
    }

    public function transition(TransitionLaboratoryOrderRequest $request, LaboratoryOrder $order): JsonResponse
    {
        $profile = LaboratoryAccess::profile($request->user());
        abort_unless($order->laboratory_profile_id === $profile->id, 404);

        $to = LaboratoryOrderStatus::from($request->validated('status'));
        $updated = $this->workflow->transition($order, $to, $request->user());
        $updated->load(['patient:id,name,phone', 'items', 'results', 'events']);

        return response()->json([
            'data' => (new LaboratoryOrderResource($updated))->resolve(),
            'message' => 'Request status updated.',
        ]);
    }
}
