<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Models\DoctorProfile;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class AvailabilityResolver
{
    /** @return array<int, array{date:string,slots:array<int,array{starts_at:string,ends_at:string}>}> */
    public function resolve(DoctorProfile $doctor, CarbonImmutable $from, CarbonImmutable $to): array
    {
        if ($to->lt($from) || $from->diffInDays($to) > 31) {
            throw new InvalidArgumentException('Availability range must be between 1 and 31 days.');
        }
        $doctor->loadMissing([
            'schedules' => fn ($query) => $query->where('is_active', true)->orderBy('start_time'),
            'exceptions' => fn ($query) => $query->whereBetween('exception_date', [$from->toDateString(), $to->toDateString()]),
            'appointments' => fn ($query) => $query->where('status', AppointmentStatus::Confirmed->value)
                ->where('ends_at', '>', $from)->where('starts_at', '<', $to->endOfDay()),
        ]);

        $now = CarbonImmutable::now(config('app.timezone'));
        $result = [];
        for ($date = $from->startOfDay(); $date->lte($to->startOfDay()); $date = $date->addDay()) {
            $exceptions = $doctor->exceptions->filter(fn ($item) => $item->exception_date->isSameDay($date));
            $windows = $this->windowsForDate($doctor->schedules, $exceptions, $date);
            $slots = [];
            foreach ($windows as $window) {
                for ($start = $window['start']; $start->addMinutes($window['duration'])->lte($window['end']); $start = $start->addMinutes($window['duration'])) {
                    $end = $start->addMinutes($window['duration']);
                    if ($start->lte($now) || $this->isBlocked($start, $end, $exceptions) || $this->hasAppointment($start, $end, $doctor->appointments)) {
                        continue;
                    }
                    $slots[] = ['starts_at' => $start->toIso8601String(), 'ends_at' => $end->toIso8601String()];
                }
            }
            if ($slots !== []) {
                $result[] = ['date' => $date->toDateString(), 'slots' => $slots];
            }
        }

        return $result;
    }

    private function windowsForDate(Collection $schedules, Collection $exceptions, CarbonImmutable $date): array
    {
        if ($exceptions->contains('type', 'unavailable')) {
            return [];
        }
        $modified = $exceptions->where('type', 'modified');
        $source = $modified->isNotEmpty() ? $modified : $schedules->where('day_of_week', $date->dayOfWeek);

        return $source->map(function ($period) use ($date, $schedules) {
            $duration = $period->slot_duration_minutes ?? $schedules->where('day_of_week', $date->dayOfWeek)->first()?->slot_duration_minutes ?? 30;

            return [
                'start' => CarbonImmutable::parse($date->toDateString().' '.$period->start_time, config('app.timezone')),
                'end' => CarbonImmutable::parse($date->toDateString().' '.$period->end_time, config('app.timezone')),
                'duration' => (int) $duration,
            ];
        })->values()->all();
    }

    private function isBlocked(CarbonImmutable $start, CarbonImmutable $end, Collection $exceptions): bool
    {
        return $exceptions->where('type', 'blocked')->contains(function ($block) use ($start, $end) {
            $blockStart = CarbonImmutable::parse($start->toDateString().' '.$block->start_time, config('app.timezone'));
            $blockEnd = CarbonImmutable::parse($start->toDateString().' '.$block->end_time, config('app.timezone'));

            return $start->lt($blockEnd) && $end->gt($blockStart);
        });
    }

    private function hasAppointment(CarbonImmutable $start, CarbonImmutable $end, Collection $appointments): bool
    {
        return $appointments->contains(fn ($appointment) => $start->lt($appointment->ends_at) && $end->gt($appointment->starts_at));
    }
}
