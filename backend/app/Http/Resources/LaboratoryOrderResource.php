<?php

namespace App\Http\Resources;

use App\Models\LaboratoryOrder;
use App\Models\LaboratoryResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin LaboratoryOrder */
class LaboratoryOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $latest = $this->relationLoaded('results')
            ? $this->results->sortByDesc('id')->first()
            : $this->latestResult();

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'status' => $this->status->value,
            'requested_at' => $this->requested_at?->toIso8601String(),
            'laboratory_name' => $this->laboratory_name_snapshot,
            'laboratory_profile_id' => $this->laboratory_profile_id,
            'patient' => $this->whenLoaded('patient', fn () => [
                'id' => $this->patient->id,
                'name' => $this->patient->name,
                'phone' => $this->patient->phone,
            ]),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'lab_test_id' => $item->lab_test_id,
                'name_en' => $item->name_en,
                'name_ar' => $item->name_ar,
                'short_name' => $item->short_name,
                'price' => $item->price,
                'currency' => $item->currency,
                'estimated_turnaround_hours' => $item->estimated_turnaround_hours,
            ])->values()),
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($event) => [
                'id' => $event->id,
                'from_status' => $event->from_status,
                'to_status' => $event->to_status,
                'created_at' => $event->created_at?->toIso8601String(),
            ])->values()),
            'result' => $latest ? $this->resultPayload($latest) : null,
        ];
    }

    /** @return array<string, mixed> */
    private function resultPayload(LaboratoryResult $result): array
    {
        return [
            'id' => $result->id,
            'uploaded_at' => $result->created_at?->toIso8601String(),
            'mime_type' => $result->mime_type,
            'original_filename' => $result->original_filename,
            'size_bytes' => $result->size_bytes,
        ];
    }
}
