<?php

namespace App\Enums;

enum CityProposalStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Mapped = 'mapped';
    case Rejected = 'rejected';
}
