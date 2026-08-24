<?php

namespace App\Http\Requests\Doctor;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ReplaceScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'periods' => ['present', 'array', 'max:21'],
            'periods.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'periods.*.start_time' => ['required', 'date_format:H:i'],
            'periods.*.end_time' => ['required', 'date_format:H:i', 'after:periods.*.start_time'],
            'periods.*.slot_duration_minutes' => ['required', 'integer', 'between:10,240'],
            'periods.*.is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            $periods = collect($this->input('periods', []))->groupBy('day_of_week');
            foreach ($periods as $dayPeriods) {
                $sorted = $dayPeriods->sortBy('start_time')->values();
                foreach ($sorted as $period) {
                    $minutes = (strtotime($period['end_time']) - strtotime($period['start_time'])) / 60;
                    if (($period['slot_duration_minutes'] ?? PHP_INT_MAX) > $minutes) {
                        $validator->errors()->add('periods', 'Slot duration must fit inside its working period.');

                        return;
                    }
                }
                for ($i = 1; $i < $sorted->count(); $i++) {
                    if ($sorted[$i]['start_time'] < $sorted[$i - 1]['end_time']) {
                        $validator->errors()->add('periods', 'Schedule periods for the same day cannot overlap.');

                        return;
                    }
                }
            }
        }];
    }
}
