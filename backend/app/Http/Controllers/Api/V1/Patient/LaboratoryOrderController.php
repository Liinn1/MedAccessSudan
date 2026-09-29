<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Enums\DoctorVerificationStatus;
use App\Enums\LaboratoryOrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Patient\StoreLaboratoryOrderRequest;
use App\Http\Resources\LaboratoryOrderResource;
use App\Models\LaboratoryOffering;
use App\Models\LaboratoryOrder;
use App\Models\LaboratoryProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Services\LaboratoryResultFileService;

class LaboratoryOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = LaboratoryOrder::query()
            ->where('patient_id', $request->user()->id)
            ->with(['items', 'results', 'events'])
            ->latest('id')
            ->get();

        return response()->json(['data' => LaboratoryOrderResource::collection($orders)->resolve()]);
    }

    public function show(Request $request, LaboratoryOrder $order): JsonResponse
    {
        abort_unless($order->patient_id === $request->user()->id, 404);
        $order->load(['items', 'results', 'events']);

        return response()->json(['data' => (new LaboratoryOrderResource($order))->resolve()]);
    }

    public function store(StoreLaboratoryOrderRequest $request): JsonResponse
    {
        $data = $request->validated();
        $laboratory = LaboratoryProfile::query()->findOrFail($data['laboratory_profile_id']);

        if ($laboratory->verification_status !== DoctorVerificationStatus::Verified->value) {
            return response()->json([
                'message' => 'This laboratory is not currently accepting test requests.',
                'code' => 'LABORATORY_UNAVAILABLE',
            ], 422);
        }

        $offerings = LaboratoryOffering::query()
            ->with('labTest')
            ->where('laboratory_profile_id', $laboratory->id)
            ->where('is_available', true)
            ->whereIn('lab_test_id', $data['lab_test_ids'])
            ->get()
            ->keyBy('lab_test_id');

        if ($offerings->count() !== count($data['lab_test_ids'])) {
            return response()->json([
                'message' => 'One or more selected tests are not currently available at this laboratory.',
                'code' => 'TEST_UNAVAILABLE',
            ], 422);
        }

        $order = DB::transaction(function () use ($request, $laboratory, $offerings, $data): LaboratoryOrder {
            $order = LaboratoryOrder::query()->create([
                'reference' => 'TMP',
                'patient_id' => $request->user()->id,
                'laboratory_profile_id' => $laboratory->id,
                'laboratory_name_snapshot' => $laboratory->name,
                'status' => LaboratoryOrderStatus::Requested,
                'requested_at' => now(),
            ]);
            $order->update(['reference' => 'LAB-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT)]);

            foreach ($data['lab_test_ids'] as $testId) {
                $offering = $offerings->get($testId);
                $test = $offering->labTest;
                $order->items()->create([
                    'lab_test_id' => $test->id,
                    'laboratory_offering_id' => $offering->id,
                    'name_en' => $test->name_en,
                    'name_ar' => $test->name_ar,
                    'short_name' => $test->short_name,
                    'price' => $offering->price,
                    'currency' => $offering->currency,
                    'estimated_turnaround_hours' => $offering->estimated_turnaround_hours,
                ]);
            }

            $order->events()->create([
                'actor_user_id' => $request->user()->id,
                'from_status' => null,
                'to_status' => LaboratoryOrderStatus::Requested->value,
            ]);

            return $order;
        });

        $order->load(['items', 'results', 'events']);

        return response()->json([
            'data' => (new LaboratoryOrderResource($order))->resolve(),
            'message' => 'Laboratory test request submitted.',
        ], 201);
    }

    public function download(Request $request, LaboratoryOrder $order, LaboratoryResultFileService $files): StreamedResponse
    {
        abort_unless($order->patient_id === $request->user()->id, 404);
        abort_unless($order->status === LaboratoryOrderStatus::ResultReady, 404);

        $result = $order->latestResult();
        abort_unless($result, 404);

        return $files->download($result);
    }
}
