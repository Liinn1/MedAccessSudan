<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdminRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'role' => ['sometimes', Rule::in([UserRole::Admin->value, UserRole::SuperAdmin->value])],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
