<?php

namespace App\Http\Resources;

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
        return [
            'id' => $this->id,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'profile_image_url' => ProfilePhotoService::publicUrl($this->profile_image_path),
            'role' => $this->role->value,
        ];
    }
}
