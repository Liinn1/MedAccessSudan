<?php

namespace App\Models;

use App\Enums\AppointmentServiceType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorAvailabilityException extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'exception_date' => 'date',
            'consultation_type' => AppointmentServiceType::class,
        ];
    }

    public function doctorProfile(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class);
    }
}
