<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DoctorProfile extends Model
{
    protected $guarded = [];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function specialization(): BelongsTo
    {
        return $this->belongsTo(Specialization::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function availability(): HasMany
    {
        return $this->hasMany(DoctorAvailability::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(DoctorAvailabilitySchedule::class);
    }

    public function exceptions(): HasMany
    {
        return $this->hasMany(DoctorAvailabilityException::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function cityProposal(): HasOne
    {
        return $this->hasOne(CityProposal::class);
    }

    public function scopeBookable(Builder $query): Builder
    {
        return $query->where('verification_status', 'verified')
            ->whereNotNull('profile_image_path')
            ->whereHas('user', fn (Builder $user) => $user->where('role', UserRole::Doctor->value))
            ->whereHas('specialization', fn (Builder $specialization) => $specialization->where('is_active', true))
            ->whereHas('location', fn (Builder $location) => $location->where('is_active', true));
    }
}
