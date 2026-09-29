<?php

namespace App\Enums;

enum LaboratoryCatalogRequestStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
