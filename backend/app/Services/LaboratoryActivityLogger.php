<?php

namespace App\Services;

use App\Models\LaboratoryActivityLog;
use App\Models\LaboratoryProfile;
use App\Models\User;

class LaboratoryActivityLogger
{
    /** @param  array<string, mixed>|null  $metadata */
    public function record(LaboratoryProfile $laboratory, ?User $actor, string $action, ?array $metadata = null): void
    {
        LaboratoryActivityLog::query()->create([
            'laboratory_profile_id' => $laboratory->id,
            'actor_user_id' => $actor?->id,
            'action' => $action,
            'metadata' => $metadata,
        ]);
    }
}
