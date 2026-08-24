<?php

namespace App\Http\Requests\Patient;

use Illuminate\Foundation\Http\FormRequest;

class BookAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['doctor_profile_id' => ['required', 'integer', 'exists:doctor_profiles,id'], 'starts_at' => ['required', 'date'], 'notes' => ['nullable', 'string', 'max:2000']];
    }
}
