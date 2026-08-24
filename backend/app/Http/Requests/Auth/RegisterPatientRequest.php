<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Services\ProfilePhotoService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterPatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', Rule::unique(User::class, 'email')],
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{7,15}$/', 'max:30', Rule::unique(User::class, 'phone')],
            'password' => ['required', 'string', 'confirmed', 'max:255', Password::min(8)->letters()->numbers()],
            'profile_photo' => ['nullable', ...ProfilePhotoService::VALIDATION_RULES],
        ];
    }

    protected function prepareForValidation(): void
    {
        $email = $this->input('email');
        $phone = $this->input('phone');
        $firstName = $this->input('first_name');
        $lastName = $this->input('last_name');

        $this->merge([
            'email' => is_string($email) ? Str::lower(trim($email)) : $email,
            'phone' => is_string($phone) ? str_replace([' ', '-', '(', ')'], '', trim($phone)) : $phone,
            'first_name' => is_string($firstName) ? trim($firstName) : $firstName,
            'last_name' => is_string($lastName) ? trim($lastName) : $lastName,
        ]);
    }
}
