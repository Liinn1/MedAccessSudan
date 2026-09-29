<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LaboratoryProfile extends Model
{
    protected $guarded = [];

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
}
