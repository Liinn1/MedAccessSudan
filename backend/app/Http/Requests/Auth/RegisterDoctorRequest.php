<?php

namespace App\Http\Requests\Auth;

use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use App\Services\ProfilePhotoService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterDoctorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique(User::class, 'email')],
            'phone' => ['required', 'regex:/^\+?[0-9]{7,15}$/', 'max:30', Rule::unique(User::class, 'phone')],
            'password' => ['required', 'confirmed', 'max:255', Password::min(8)->letters()->numbers()],
            'specialization' => ['required', Rule::exists(Specialization::class, 'code')->where('is_active', true)],
            'location' => ['nullable', 'required_without:proposed_city', Rule::exists(Location::class, 'code')->where('is_active', true)],
            'proposed_city' => ['nullable', 'required_without:location', 'string', 'min:2', 'max:150'],
            'clinic_name' => ['nullable', 'string', 'max:255'],
            'profile_photo' => ['required', ...ProfilePhotoService::VALIDATION_RULES],
        ];
    }

    protected function prepareForValidation(): void
    {
        $clean = fn (string $key) => is_string($this->input($key)) ? trim($this->input($key)) : $this->input($key);
        $this->merge([
            'first_name' => $clean('first_name'),
            'last_name' => $clean('last_name'),
            'email' => is_string($this->input('email')) ? Str::lower(trim($this->input('email'))) : $this->input('email'),
            'phone' => is_string($this->input('phone')) ? str_replace([' ', '-', '(', ')'], '', trim($this->input('phone'))) : $this->input('phone'),
            'clinic_name' => $clean('clinic_name') ?: null,
            'location' => $clean('location') ?: null,
            'proposed_city' => $clean('proposed_city') ?: null,
        ]);
    }
}
