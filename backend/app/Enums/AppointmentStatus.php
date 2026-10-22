<?php

namespace App\Enums;

enum AppointmentStatus: string
{
    case Confirmed = 'confirmed';
    case InProgress = 'in_progress';
    case Cancelled = 'cancelled';
    case Completed = 'completed';
}
