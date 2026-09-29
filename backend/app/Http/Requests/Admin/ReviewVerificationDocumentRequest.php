<?php

namespace App\Http\Requests\Admin;

use App\Enums\VerificationDocumentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewVerificationDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in([
                VerificationDocumentStatus::Approved->value,
                VerificationDocumentStatus::Rejected->value,
            ])],
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
