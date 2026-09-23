<?php

namespace App\Http\Requests\Patient;

use App\Enums\AppointmentServiceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SearchDoctorsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'specialization' => ['sometimes', 'nullable', 'string', Rule::exists('specializations', 'code')->where('is_active', true)],
            'location' => ['required_if:service_type,home_visit', 'nullable', 'string', Rule::exists('locations', 'code')->where('is_active', true)],
            'availability' => ['sometimes', 'nullable', Rule::in(['today', 'week'])],
            'service_type' => ['sometimes', Rule::enum(AppointmentServiceType::class)],
        ];
    }
}
