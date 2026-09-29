<?php

namespace App\Http\Requests\Concerns;

use App\Enums\PaymentMethod;
use Illuminate\Validation\Rule;

trait ValidatesServicePayment
{
    /** @return array<string, mixed> */
    protected function paymentRules(): array
    {
        return [
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
            'payment_status' => ['prohibited'],
            'amount' => ['prohibited'],
            'price' => ['prohibited'],
            'currency' => ['prohibited'],
            'card_number' => ['prohibited'],
            'cardNumber' => ['prohibited'],
            'cvv' => ['prohibited'],
            'cvc' => ['prohibited'],
            'card_cvv' => ['prohibited'],
            'expiry' => ['prohibited'],
            'expiry_date' => ['prohibited'],
            'cardholder_name' => ['prohibited'],
            'card_holder_name' => ['prohibited'],
            'name_on_card' => ['prohibited'],
        ];
    }
}
