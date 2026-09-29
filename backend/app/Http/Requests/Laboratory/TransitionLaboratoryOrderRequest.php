<?php

namespace App\Http\Requests\Laboratory;

use App\Enums\LaboratoryOrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransitionLaboratoryOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(LaboratoryOrderStatus::class)],
        ];
    }
}
