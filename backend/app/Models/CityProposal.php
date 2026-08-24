<?php

namespace App\Models;

use App\Enums\CityProposalStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CityProposal extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'status' => CityProposalStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    public function doctorProfile(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class);
    }

    public function resolvedLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'resolved_location_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
