<?php

namespace App\Http\Requests\Profile;

use App\Services\ProfilePhotoService;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProfilePhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['profile_photo' => ['required', ...ProfilePhotoService::VALIDATION_RULES]];
    }
}
