<?php

namespace App\Http\Requests\Laboratory;

use Illuminate\Foundation\Http\FormRequest;

class UploadLaboratoryResultRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $max = (int) config('medaccess.laboratory_result_max_kilobytes', 8192);

        return [
            'result' => [
                'required',
                'file',
                'max:'.$max,
                'mimes:pdf,jpg,jpeg,png,webp',
                'mimetypes:application/pdf,image/jpeg,image/png,image/webp',
            ],
        ];
    }
}
