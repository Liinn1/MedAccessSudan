<?php

namespace App\Http\Requests\Patient;

use App\Enums\LaboratoryCollectionMethod;
use App\Http\Requests\Concerns\ValidatesServicePayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLaboratoryOrderRequest extends FormRequest
{
    use ValidatesServicePayment;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('collection_method')) {
            $this->merge(['collection_method' => LaboratoryCollectionMethod::AtLab->value]);
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $home = $this->input('collection_method') === LaboratoryCollectionMethod::HomeCollection->value;

        return [
            ...$this->paymentRules(),
            'laboratory_profile_id' => ['required', 'integer', 'exists:laboratory_profiles,id'],
            'lab_test_ids' => ['required', 'array', 'min:1', 'max:20'],
            'lab_test_ids.*' => ['integer', 'distinct', 'exists:lab_tests,id'],
            'collection_method' => ['required', Rule::enum(LaboratoryCollectionMethod::class)],
            'collection_location_id' => [$home ? 'required' : 'nullable', 'integer', 'exists:locations,id'],
            'collection_area' => [$home ? 'required' : 'nullable', 'string', 'max:255'],
            'collection_address' => [$home ? 'required' : 'nullable', 'string', 'max:500'],
            'collection_notes' => ['nullable', 'string', 'max:2000'],
            'collection_starts_at' => [$home ? 'required' : 'nullable', 'date', 'after:now'],
            'collection_latitude' => [$home ? 'required' : 'nullable', 'numeric', 'between:-90,90'],
            'collection_longitude' => [$home ? 'required' : 'nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
