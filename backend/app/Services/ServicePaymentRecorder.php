<?php

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Records a booking payment intent after a service record exists.
 *
 * This is not a payment gateway. Card PAN/CVV must never be passed here.
 * A future provider should collect credentials via hosted fields/tokenization,
 * then update status from the provider response or webhook.
 */
class ServicePaymentRecorder
{
    public function record(
        User $patient,
        Model $payable,
        PaymentMethod $method,
        ?string $amount = null,
        ?string $currency = null,
    ): Payment {
        $status = $method === PaymentMethod::PayLater
            ? PaymentStatus::Unpaid
            : PaymentStatus::Pending;

        return $payable->payment()->create([
            'patient_id' => $patient->id,
            'method' => $method,
            'status' => $status,
            'amount' => $amount,
            'currency' => $currency,
            'provider' => $method === PaymentMethod::Card ? 'development' : null,
            'provider_reference' => null,
        ]);
    }
}
