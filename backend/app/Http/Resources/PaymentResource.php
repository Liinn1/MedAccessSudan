<?php

namespace App\Http\Resources;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Payment */
class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'method' => $this->method->value,
            'status' => $this->status->value,
            'amount' => $this->amount !== null ? number_format((float) $this->amount, 2, '.', '') : null,
            'currency' => $this->currency,
        ];
    }
}
