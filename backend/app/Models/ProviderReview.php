<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A patient's rating of the provider that fulfilled one specific service:
 * a completed doctor appointment or a laboratory order with a released result.
 */
class ProviderReview extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['rating' => 'integer'];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function laboratoryOrder(): BelongsTo
    {
        return $this->belongsTo(LaboratoryOrder::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function doctorProfile(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class);
    }

    public function laboratoryProfile(): BelongsTo
    {
        return $this->belongsTo(LaboratoryProfile::class);
    }

    public function scopeForDoctors(Builder $query): Builder
    {
        return $query->whereNotNull('doctor_profile_id');
    }
}
