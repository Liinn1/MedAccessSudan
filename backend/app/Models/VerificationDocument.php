<?php

namespace App\Models;

use App\Enums\VerificationDocumentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VerificationDocument extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'uploaded_at' => 'datetime',
            'status' => VerificationDocumentStatus::class,
            'size_bytes' => 'integer',
        ];
    }

    public function verification(): BelongsTo
    {
        return $this->belongsTo(ProviderVerification::class, 'provider_verification_id');
    }
}
