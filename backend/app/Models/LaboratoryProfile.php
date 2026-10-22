<?php

namespace App\Models;

use App\Enums\DoctorVerificationStatus;
use App\Enums\LaboratoryOrderStatus;
use App\Models\Concerns\HasProfessionalVerification;
use App\Models\Concerns\HasProviderRatings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LaboratoryProfile extends Model
{
    use HasProfessionalVerification;
    use HasProviderRatings;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'supports_at_lab' => 'boolean',
            'supports_home_collection' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function offerings(): HasMany
    {
        return $this->hasMany(LaboratoryOffering::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(LaboratoryOrder::class);
    }

    public function catalogRequests(): HasMany
    {
        return $this->hasMany(LaboratoryCatalogRequest::class);
    }

    public function scopeVisibleToPatients(Builder $query): Builder
    {
        return $query->where('verification_status', DoctorVerificationStatus::Verified->value)
            ->whereHas('user', fn (Builder $user) => $user->where('is_active', true));
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProviderReview::class)->whereHas('laboratoryOrder', fn (Builder $order) => $order
            ->where('status', LaboratoryOrderStatus::ResultReady->value)
            ->whereColumn('laboratory_orders.patient_id', 'provider_reviews.patient_id')
            ->whereColumn('laboratory_orders.laboratory_profile_id', 'provider_reviews.laboratory_profile_id'));
    }
}
