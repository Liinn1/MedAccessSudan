<?php

namespace App\Http\Requests\Laboratory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLaboratoryProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20'],
            'address' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', Rule::exists('locations', 'code')->where('is_active', true)],
            'supports_at_lab' => ['sometimes', 'boolean'],
            'supports_home_collection' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $profile = $this->user()?->laboratoryProfile;
            $supportsAtLab = $this->exists('supports_at_lab') ? $this->boolean('supports_at_lab') : (bool) $profile?->supports_at_lab;
            $supportsHome = $this->exists('supports_home_collection') ? $this->boolean('supports_home_collection') : (bool) $profile?->supports_home_collection;
            if (! $supportsAtLab && ! $supportsHome) {
                $validator->errors()->add('supports_at_lab', 'Select at least one laboratory service mode.');
            }
        });
    }

    protected function prepareForValidation(): void
    {
        foreach (['name', 'phone', 'address', 'location'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim($this->input($field)) ?: null]);
            }
        }
    }
}
