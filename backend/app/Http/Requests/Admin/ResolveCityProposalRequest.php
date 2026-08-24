<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResolveCityProposalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', Rule::in(['approve', 'map', 'reject'])],
            'name_en' => ['nullable', 'required_if:action,approve', 'string', 'min:2', 'max:100'],
            'name_ar' => ['nullable', 'string', 'min:2', 'max:100'],
            'location_id' => ['nullable', 'required_if:action,map', Rule::exists('locations', 'id')->where('is_active', true)],
        ];
    }
}
