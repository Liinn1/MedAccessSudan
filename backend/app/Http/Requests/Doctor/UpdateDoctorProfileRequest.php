<?php

namespace App\Http\Requests\Doctor;

use App\Enums\AppointmentServiceType;
use App\Enums\AppointmentStatus;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDoctorProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'clinic_name' => ['nullable', 'string', 'max:255'],
            'biography' => ['nullable', 'string', 'max:2000'],
            'biography_language' => ['nullable', 'required_with:biography', 'in:en,ar'],
            'offers_clinic_visits' => ['sometimes', 'boolean'],
            'offers_home_visits' => ['sometimes', 'boolean'],
            'specialization_id' => ['prohibited'],
            'location_id' => ['prohibited'],
            'verification_status' => ['prohibited'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->exists('offers_clinic_visits') && ! $this->exists('offers_home_visits')) {
                return;
            }
            if (! $this->boolean('offers_clinic_visits') && ! $this->boolean('offers_home_visits')) {
                $validator->errors()->add('offers_clinic_visits', 'Select at least one consultation type.');
            }
            $profile = $this->user()?->doctorProfile;
            if (! $profile) return;
            foreach ([AppointmentServiceType::Clinic, AppointmentServiceType::HomeVisit] as $type) {
                $field = $type === AppointmentServiceType::Clinic ? 'offers_clinic_visits' : 'offers_home_visits';
                if ($profile->{$field} && $this->exists($field) && ! $this->boolean($field) && $profile->appointments()->where('service_type', $type->value)->where('status', AppointmentStatus::Confirmed->value)->where('starts_at', '>', now())->exists()) {
                    $validator->errors()->add($field, 'This service cannot be disabled while it has future confirmed appointments.');
                }
            }
        });
    }

    protected function prepareForValidation(): void
    {
        foreach (['clinic_name', 'biography'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim($this->input($field)) ?: null]);
            }
        }
    }
}
