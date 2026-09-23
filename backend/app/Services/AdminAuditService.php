<?php

namespace App\Services;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AdminAuditService
{
    public function record(User $administrator, string $action, ?Model $subject = null, array $metadata = []): void
    {
        AdminAuditLog::create([
            'admin_user_id' => $administrator->id,
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'metadata' => $metadata ?: null,
        ]);
    }
}
