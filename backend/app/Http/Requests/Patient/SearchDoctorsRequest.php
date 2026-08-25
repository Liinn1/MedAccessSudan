<?php

namespace App\Http\Requests\Patient;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SearchDoctorsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'specialization' => ['sometimes', 'nullable', 'string', Rule::exists('specializations', 'code')->where('is_active', true)],
            'location' => ['sometimes', 'nullable', 'string', Rule::exists('locations', 'code')->where('is_active', true)],
            'availability' => ['sometimes', 'nullable', Rule::in(['today', 'week'])],
        ];
    }
}
