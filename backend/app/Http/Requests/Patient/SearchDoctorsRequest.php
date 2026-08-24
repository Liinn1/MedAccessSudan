<?php

namespace App\Http\Requests\Patient;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SearchDoctorsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'specialization' => ['required', 'string', Rule::exists('specializations', 'code')->where('is_active', true)],
            'location' => ['required', 'string', Rule::exists('locations', 'code')->where('is_active', true)],
            'availability' => ['required', Rule::in(['today', 'week'])],
        ];
    }
}
