<?php

namespace App\Enums;

enum UserRole: string
{
    case Patient = 'patient';
    case Doctor = 'doctor';
    case Admin = 'admin';
    case SuperAdmin = 'super_admin';

    public function isAdministrative(): bool
    {
        return in_array($this, [self::Admin, self::SuperAdmin], true);
    }
}
