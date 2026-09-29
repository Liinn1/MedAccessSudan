<?php

namespace App\Models;

use App\Enums\LaboratoryOrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LaboratoryOrder extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'status' => LaboratoryOrderStatus::class,
            'requested_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function laboratoryProfile(): BelongsTo
    {
        return $this->belongsTo(LaboratoryProfile::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(LaboratoryOrderItem::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(LaboratoryOrderEvent::class);
    }

    public function results(): HasMany
    {
        return $this->hasMany(LaboratoryResult::class);
    }

    public function latestResult(): ?LaboratoryResult
    {
        return $this->results()->latest('id')->first();
    }
}
