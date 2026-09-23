<?php

namespace Tests\Unit;

use App\Enums\AppointmentServiceType;
use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\DoctorAvailabilityException;
use App\Models\DoctorAvailabilitySchedule;
use App\Models\DoctorProfile;
use App\Services\AvailabilityResolver;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Tests\TestCase;

class AvailabilityResolverTest extends TestCase
{
    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_weekly_period_produces_bounded_slots(): void
    {
        CarbonImmutable::setTestNow('2026-08-23 08:00:00 Africa/Khartoum');
        $doctor = $this->doctor([new DoctorAvailabilitySchedule(['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00', 'slot_duration_minutes' => 30, 'is_active' => true])]);
        $days = (new AvailabilityResolver)->resolve($doctor, CarbonImmutable::parse('2026-08-24'), CarbonImmutable::parse('2026-08-24'));
        $this->assertCount(6, $days[0]['slots']);
        $this->assertStringContainsString('09:00:00', $days[0]['slots'][0]['starts_at']);
        $this->assertStringContainsString('12:00:00', $days[0]['slots'][5]['ends_at']);
    }

    public function test_unavailable_exception_removes_day(): void
    {
        CarbonImmutable::setTestNow('2026-08-23 08:00:00 Africa/Khartoum');
        $doctor = $this->doctor([new DoctorAvailabilitySchedule(['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00', 'slot_duration_minutes' => 30, 'is_active' => true])], [new DoctorAvailabilityException(['exception_date' => '2026-08-24', 'type' => 'unavailable'])]);
        $this->assertSame([], (new AvailabilityResolver)->resolve($doctor, CarbonImmutable::parse('2026-08-24'), CarbonImmutable::parse('2026-08-24')));
    }

    public function test_modified_hours_replace_normal_hours(): void
    {
        CarbonImmutable::setTestNow('2026-08-23 08:00:00 Africa/Khartoum');
        $doctor = $this->doctor([new DoctorAvailabilitySchedule(['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00', 'slot_duration_minutes' => 30, 'is_active' => true])], [new DoctorAvailabilityException(['exception_date' => '2026-08-24', 'type' => 'modified', 'start_time' => '10:00', 'end_time' => '11:00'])]);
        $days = (new AvailabilityResolver)->resolve($doctor, CarbonImmutable::parse('2026-08-24'), CarbonImmutable::parse('2026-08-24'));
        $this->assertCount(2, $days[0]['slots']);
        $this->assertStringContainsString('10:00:00', $days[0]['slots'][0]['starts_at']);
    }

    public function test_existing_appointment_removes_overlapping_slot(): void
    {
        CarbonImmutable::setTestNow('2026-08-23 08:00:00 Africa/Khartoum');
        $doctor = $this->doctor([new DoctorAvailabilitySchedule(['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30, 'is_active' => true])], [], [new Appointment(['starts_at' => '2026-08-24 10:00', 'ends_at' => '2026-08-24 10:30', 'status' => AppointmentStatus::Confirmed])]);
        $days = (new AvailabilityResolver)->resolve($doctor, CarbonImmutable::parse('2026-08-24'), CarbonImmutable::parse('2026-08-24'));
        $this->assertCount(3, $days[0]['slots']);
        $this->assertFalse(collect($days[0]['slots'])->contains(fn ($slot) => str_contains($slot['starts_at'], '10:00:00')));
    }

    public function test_confirmed_clinic_appointment_blocks_home_visit_slot_at_the_same_time(): void
    {
        CarbonImmutable::setTestNow('2026-08-23 08:00:00 Africa/Khartoum');
        $doctor = new DoctorProfile([
            'verification_status' => 'verified',
            'offers_clinic_visits' => true,
            'offers_home_visits' => true,
        ]);
        $doctor->setRelation('schedules', new Collection([
            new DoctorAvailabilitySchedule(['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30, 'is_active' => true, 'consultation_type' => 'clinic']),
            new DoctorAvailabilitySchedule(['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30, 'is_active' => true, 'consultation_type' => 'home_visit']),
        ]));
        $doctor->setRelation('exceptions', new Collection);
        $doctor->setRelation('appointments', new Collection([
            new Appointment(['starts_at' => '2026-08-24 10:00', 'ends_at' => '2026-08-24 10:30', 'status' => AppointmentStatus::Confirmed, 'service_type' => 'clinic']),
        ]));

        $days = (new AvailabilityResolver)->resolve($doctor, CarbonImmutable::parse('2026-08-24'), CarbonImmutable::parse('2026-08-24'), AppointmentServiceType::HomeVisit);
        $this->assertFalse(collect($days[0]['slots'])->contains(fn ($slot) => str_contains($slot['starts_at'], '10:00:00')));
        $this->assertTrue(collect($days[0]['slots'])->contains(fn ($slot) => str_contains($slot['starts_at'], '09:00:00')));
    }

    public function test_past_slots_are_excluded_without_moving_the_schedule_boundary(): void
    {
        CarbonImmutable::setTestNow('2026-08-24 10:10:00 Africa/Khartoum');
        $doctor = $this->doctor([new DoctorAvailabilitySchedule(['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00', 'slot_duration_minutes' => 30, 'is_active' => true])]);
        $days = (new AvailabilityResolver)->resolve($doctor, CarbonImmutable::parse('2026-08-24'), CarbonImmutable::parse('2026-08-24'));

        $this->assertCount(3, $days[0]['slots']);
        $this->assertStringContainsString('10:30:00', $days[0]['slots'][0]['starts_at']);
        $this->assertStringContainsString('12:00:00', $days[0]['slots'][2]['ends_at']);
    }

    private function doctor(array $schedules, array $exceptions = [], array $appointments = []): DoctorProfile
    {
        $doctor = new DoctorProfile(['verification_status' => 'verified']);
        $doctor->setRelation('schedules', new Collection($schedules));
        $doctor->setRelation('exceptions', new Collection($exceptions));
        $doctor->setRelation('appointments', new Collection($appointments));

        return $doctor;
    }
}
