<?php

namespace App\Http\Requests\Doctor;

use App\Enums\AppointmentServiceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAvailabilityExceptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'consultation_type' => ['required', Rule::enum(AppointmentServiceType::class)],
            'exception_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'type' => ['required', Rule::in(['unavailable', 'modified', 'blocked'])],
            'start_time' => [Rule::requiredIf(fn () => $this->input('type') !== 'unavailable'), 'nullable', 'date_format:H:i'],
            'end_time' => [Rule::requiredIf(fn () => $this->input('type') !== 'unavailable'), 'nullable', 'date_format:H:i', 'after:start_time'],
        ];
    }
}
