<?php

namespace App\Http\Requests\Laboratory;

use Illuminate\Foundation\Http\FormRequest;

class StoreLaboratoryCatalogRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'suggested_name' => ['required', 'string', 'max:160'],
            'suggested_lab_test_category_id' => ['nullable', 'integer', 'exists:lab_test_categories,id'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
