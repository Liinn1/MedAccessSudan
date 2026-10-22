<?php

namespace App\Http\Requests\Auth;

use App\Models\Location;
use App\Models\User;
use App\Services\ProfilePhotoService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterLaboratoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'laboratory_name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique(User::class, 'email')],
            'phone' => ['required', 'regex:/^\+?[0-9]{7,15}$/', 'max:30', Rule::unique(User::class, 'phone')],
            'password' => ['required', 'confirmed', 'max:255', Password::min(8)->letters()->numbers()],
            'location' => ['required', Rule::exists(Location::class, 'code')->where('is_active', true)],
            'address' => ['required', 'string', 'min:4', 'max:255'],
            'supports_at_lab' => ['required', 'boolean'],
            'supports_home_collection' => ['required', 'boolean'],
            'profile_photo' => ['nullable', ...ProfilePhotoService::VALIDATION_RULES],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->boolean('supports_at_lab') && ! $this->boolean('supports_home_collection')) {
                $validator->errors()->add('supports_at_lab', 'Select at least one laboratory service mode.');
            }
        });
    }

    protected function prepareForValidation(): void
    {
        $clean = fn (string $key) => is_string($this->input($key)) ? trim($this->input($key)) : $this->input($key);

        $capabilities = [];
        if ($this->exists('supports_at_lab')) {
            $capabilities['supports_at_lab'] = $this->boolean('supports_at_lab');
        }
        if ($this->exists('supports_home_collection')) {
            $capabilities['supports_home_collection'] = $this->boolean('supports_home_collection');
        }

        $this->merge([
            'laboratory_name' => $clean('laboratory_name'),
            'email' => is_string($this->input('email')) ? Str::lower(trim($this->input('email'))) : $this->input('email'),
            'phone' => is_string($this->input('phone')) ? str_replace([' ', '-', '(', ')'], '', trim($this->input('phone'))) : $this->input('phone'),
            'location' => $clean('location') ?: null,
            'address' => $clean('address'),
            ...$capabilities,
        ]);
    }
}
