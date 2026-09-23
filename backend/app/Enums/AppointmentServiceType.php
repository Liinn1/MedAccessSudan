<?php

namespace App\Enums;

enum AppointmentServiceType: string
{
    case Clinic = 'clinic';
    case HomeVisit = 'home_visit';
}
