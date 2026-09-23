<?php

namespace App\Models;

use App\Enums\AppointmentServiceType;
use App\Enums\AppointmentStatus;
use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DoctorProfile extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'offers_clinic_visits' => 'boolean',
            'offers_home_visits' => 'boolean',
        ];
    }

    public function offers(AppointmentServiceType $type): bool
    {
        return match ($type) {
            AppointmentServiceType::Clinic => (bool) ($this->offers_clinic_visits ?? true),
            AppointmentServiceType::HomeVisit => (bool) ($this->offers_home_visits ?? false),
        };
    }

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

    public function homeVisitLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'home_visit_location_id');
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

    public function reviews(): HasMany
    {
        return $this->hasMany(DoctorReview::class)->whereHas('appointment', fn (Builder $appointment) => $appointment
            ->where('status', AppointmentStatus::Completed->value)
            ->whereColumn('appointments.patient_id', 'doctor_reviews.patient_id')
            ->whereColumn('appointments.doctor_profile_id', 'doctor_reviews.doctor_profile_id'));
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
