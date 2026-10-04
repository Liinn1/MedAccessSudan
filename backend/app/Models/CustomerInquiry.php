<?php

namespace App\Models;

use App\Enums\CustomerInquiryStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerInquiry extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'status' => CustomerInquiryStatus::class,
            'last_message_at' => 'datetime',
        ];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(CustomerInquiryMessage::class)->orderBy('id');
    }
}
