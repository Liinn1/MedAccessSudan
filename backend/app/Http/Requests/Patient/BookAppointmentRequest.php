<?php

namespace App\Http\Requests\Patient;

use App\Enums\AppointmentServiceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BookAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'doctor_profile_id' => ['required', 'integer', 'exists:doctor_profiles,id'],
            'starts_at' => ['required', 'date'],
            'service_type' => ['sometimes', Rule::enum(AppointmentServiceType::class)],
            'notes' => ['nullable', 'string', 'max:2000'],
            'home_visit' => ['nullable', 'required_if:service_type,home_visit', 'array'],
            'home_visit.contact_phone' => ['required_if:service_type,home_visit', 'string', 'regex:/^\+?[0-9]{7,15}$/', 'max:30'],
            'home_visit.city' => ['required_if:service_type,home_visit', 'string', Rule::exists('locations', 'code')->where('is_active', true)],
            'home_visit.area' => ['required_if:service_type,home_visit', 'string', 'max:150'],
            'home_visit.address_details' => ['required_if:service_type,home_visit', 'string', 'max:500'],
            'home_visit.additional_directions' => ['nullable', 'string', 'max:2000'],
            'home_visit.latitude' => ['required_if:service_type,home_visit', 'numeric', 'between:-90,90'],
            'home_visit.longitude' => ['required_if:service_type,home_visit', 'numeric', 'between:-180,180'],
        ];
    }
}
