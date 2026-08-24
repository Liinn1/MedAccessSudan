<?php

namespace App\Http\Requests\Admin;

use App\Enums\DoctorVerificationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDoctorVerificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(DoctorVerificationStatus::class)],
        ];
    }
}
