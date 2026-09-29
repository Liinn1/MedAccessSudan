<?php

namespace App\Http\Requests\Laboratory;

use Illuminate\Foundation\Http\FormRequest;

class UpsertLaboratoryOfferingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'price' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:999999.99'],
            'estimated_turnaround_hours' => ['required', 'integer', 'min:1', 'max:720'],
            'is_available' => ['required', 'boolean'],
        ];
    }
}
