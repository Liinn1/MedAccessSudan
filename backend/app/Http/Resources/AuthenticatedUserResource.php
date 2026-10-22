<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use App\Services\ProfilePhotoService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthenticatedUserResource extends JsonResource
{
    /**
     * Return only identity fields required by the current authenticated UI.
     *
     * @return array<string, int|string|null>
     */
    public function toArray(Request $request): array
    {
        $profileImagePath = $this->profile_image_path;

        if ($this->role === UserRole::Doctor && $this->resource->exists) {
            $this->resource->loadMissing('doctorProfile:id,user_id,profile_image_path');
            $profileImagePath = $this->doctorProfile?->profile_image_path;
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'profile_image_url' => ProfilePhotoService::publicUrl($profileImagePath),
            'role' => $this->role->value,
        ];
    }
}
