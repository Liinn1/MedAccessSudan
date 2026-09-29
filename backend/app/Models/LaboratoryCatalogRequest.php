<?php

namespace App\Models;

use App\Enums\LaboratoryCatalogRequestStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaboratoryCatalogRequest extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['status' => LaboratoryCatalogRequestStatus::class];
    }

    public function laboratoryProfile(): BelongsTo
    {
        return $this->belongsTo(LaboratoryProfile::class);
    }

    public function suggestedCategory(): BelongsTo
    {
        return $this->belongsTo(LabTestCategory::class, 'suggested_lab_test_category_id');
    }
}
