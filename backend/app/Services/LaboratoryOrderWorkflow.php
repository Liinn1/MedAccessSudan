<?php

namespace App\Services;

use App\Enums\LaboratoryOrderStatus;
use App\Models\LaboratoryOrder;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;

class LaboratoryOrderWorkflow
{
    public function __construct(private readonly LaboratoryActivityLogger $activity) {}

    public function transition(LaboratoryOrder $order, LaboratoryOrderStatus $to, User $actor): LaboratoryOrder
    {
        $from = $order->status;
        if (! $from->canTransitionTo($to)) {
            throw new HttpResponseException(new JsonResponse([
                'message' => 'That status change is not allowed.',
                'code' => 'INVALID_STATUS_TRANSITION',
            ], 422));
        }

        if ($to === LaboratoryOrderStatus::ResultReady && $order->results()->doesntExist()) {
            throw new HttpResponseException(new JsonResponse([
                'message' => 'Upload a result document before marking the result as ready.',
                'code' => 'RESULT_DOCUMENT_REQUIRED',
            ], 422));
        }

        $order->update(['status' => $to]);
        $order->events()->create([
            'actor_user_id' => $actor->id,
            'from_status' => $from->value,
            'to_status' => $to->value,
        ]);
        $this->activity->record($order->laboratoryProfile, $actor, 'order_status_changed', [
            'order_id' => $order->id,
            'from' => $from->value,
            'to' => $to->value,
        ]);

        return $order->fresh(['items', 'events', 'results', 'patient:id,name,phone']) ?? $order;
    }
}
