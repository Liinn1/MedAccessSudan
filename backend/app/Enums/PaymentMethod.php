<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Card = 'card';
    case PayLater = 'pay_later';
}
