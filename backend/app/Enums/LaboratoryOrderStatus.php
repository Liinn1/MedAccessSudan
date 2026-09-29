<?php

namespace App\Enums;

enum LaboratoryOrderStatus: string
{
    case Requested = 'requested';
    case SampleCollected = 'sample_collected';
    case InProgress = 'in_progress';
    case ResultReady = 'result_ready';

    /**
     * Digital workflow: requested → sample collected → in progress → result ready.
     * Result ready is only allowed after a document exists (enforced in the workflow service).
     */
    public function canTransitionTo(self $next): bool
    {
        return match ($this) {
            self::Requested => $next === self::SampleCollected,
            self::SampleCollected => $next === self::InProgress,
            self::InProgress => $next === self::ResultReady,
            self::ResultReady => false,
        };
    }
}
