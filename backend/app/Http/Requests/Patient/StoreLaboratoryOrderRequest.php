<?php

namespace App\Http\Requests\Patient;

use Illuminate\Foundation\Http\FormRequest;

class StoreLaboratoryOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'laboratory_profile_id' => ['required', 'integer', 'exists:laboratory_profiles,id'],
            'lab_test_ids' => ['required', 'array', 'min:1', 'max:20'],
            'lab_test_ids.*' => ['integer', 'distinct', 'exists:lab_tests,id'],
        ];
    }
}
