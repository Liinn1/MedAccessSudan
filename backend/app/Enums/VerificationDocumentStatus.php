<?php

namespace App\Enums;

enum VerificationDocumentStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Replaced = 'replaced';
}
