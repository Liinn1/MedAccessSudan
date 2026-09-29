<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaboratoryOrderItem extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'estimated_turnaround_hours' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(LaboratoryOrder::class, 'laboratory_order_id');
    }

    public function labTest(): BelongsTo
    {
        return $this->belongsTo(LabTest::class);
    }
}
