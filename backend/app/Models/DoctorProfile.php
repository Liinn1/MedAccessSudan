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

    public function scopeVisibleToPatients(Builder $query): Builder
    {
        // Pending providers are visible only in the explicit demo mode used for
        // end-to-end graduation-project testing. Production remains verified-only.
        $visibleStatuses = config('medaccess.demo_auto_verify_doctors')
            ? ['verified', 'pending']
            : ['verified'];

        return $query->whereIn('verification_status', $visibleStatuses)
            ->whereHas('user', fn (Builder $user) => $user->where('role', UserRole::Doctor->value))
            ->whereHas('specialization', fn (Builder $specialization) => $specialization->where('is_active', true))
            ->whereHas('location', fn (Builder $location) => $location->where('is_active', true));
    }

    public function scopeBookable(Builder $query): Builder
    {
        return $query->visibleToPatients();
    }
}
