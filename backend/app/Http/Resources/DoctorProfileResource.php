<?php

namespace App\Http\Resources;

use App\Services\ProfilePhotoService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DoctorProfileResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->user->name,
            'clinic_name' => $this->clinic_name,
            'bio_en' => $this->bio_en,
            'bio_ar' => $this->bio_ar,
            'profile_image_url' => ProfilePhotoService::publicUrl($this->profile_image_path),
            'verification_status' => $this->verification_status,
            'specialization' => $this->specialization->only(['code', 'name_en', 'name_ar']),
            'location' => $this->location->only(['code', 'name_en', 'name_ar']),
            'availability' => collect($this->resolved_availability ?? [])->map(fn ($slot) => [
                'id' => $slot['starts_at'],
                'starts_at' => $slot['starts_at'],
                'ends_at' => $slot['ends_at'],
                'status' => 'available',
            ]),
        ];
    }
}
