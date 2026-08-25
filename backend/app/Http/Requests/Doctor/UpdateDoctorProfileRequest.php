<?php

namespace App\Http\Requests\Doctor;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDoctorProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'clinic_name' => ['nullable', 'string', 'max:255'],
            'biography' => ['nullable', 'string', 'max:2000'],
            'biography_language' => ['nullable', 'required_with:biography', 'in:en,ar'],
            'specialization_id' => ['prohibited'],
            'location_id' => ['prohibited'],
            'verification_status' => ['prohibited'],
        ];
    }

    protected function prepareForValidation(): void
    {
        foreach (['clinic_name', 'biography'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim($this->input($field)) ?: null]);
            }
        }
    }
}
