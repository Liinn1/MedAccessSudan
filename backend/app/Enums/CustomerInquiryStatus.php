<?php

namespace App\Enums;

enum CustomerInquiryStatus: string
{
    case New = 'new';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';
}
