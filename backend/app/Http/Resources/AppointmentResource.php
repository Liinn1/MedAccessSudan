<?php

namespace App\Http\Resources;

use App\Services\ProfilePhotoService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'starts_at' => $this->starts_at->toIso8601String(),
            'ends_at' => $this->ends_at->toIso8601String(),
            'status' => $this->status->value,
            'service_type' => $this->service_type->value,
            'notes' => $this->notes,
            'patient' => $this->whenLoaded('patient', fn () => ['id' => $this->patient->id, 'name' => $this->patient->name]),
            'doctor' => $this->whenLoaded('doctorProfile', fn () => [
                'id' => $this->doctorProfile->id,
                'name' => $this->doctorProfile->user->name,
                'clinic_name' => $this->doctorProfile->clinic_name,
                'profile_image_url' => ProfilePhotoService::publicUrl($this->doctorProfile->profile_image_path),
                'specialization' => $this->doctorProfile->specialization->only(['code', 'name_en', 'name_ar']),
                'location' => $this->doctorProfile->location->only(['code', 'name_en', 'name_ar']),
            ]),
        ];
    }
}
