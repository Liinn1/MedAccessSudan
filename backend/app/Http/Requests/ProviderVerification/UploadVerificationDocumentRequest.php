<?php

namespace App\Http\Requests\ProviderVerification;

use Illuminate\Foundation\Http\FormRequest;

class UploadVerificationDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $max = (int) config('medaccess.provider_verification.max_kilobytes', 8192);

        return [
            'document_type' => ['required', 'string', 'max:60'],
            'file' => ['required', 'file', 'max:'.$max],
        ];
    }
}
