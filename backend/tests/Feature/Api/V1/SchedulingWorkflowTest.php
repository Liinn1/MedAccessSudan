<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\DoctorAvailabilityException;
use App\Models\DoctorAvailabilitySchedule;
use App\Models\DoctorProfile;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use App\Services\AvailabilityResolver;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SchedulingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('medaccess.demo_auto_verify_doctors', false);
    }

    public function test_patient_can_book_a_resolved_slot_and_it_immediately_disappears(): void
    {
        [$doctor, $profile, $slotStart] = $this->createBookableDoctor();
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);

        $availabilityUrl = "/api/v1/patient/doctors/{$profile->id}/availability?from={$slotStart->toDateString()}&to={$slotStart->toDateString()}";
        $this->getJson($availabilityUrl)
            ->assertOk()
            ->assertJsonFragment(['starts_at' => $slotStart->toIso8601String()]);

        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->toIso8601String(),
            'notes' => 'First visit',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.service_type', 'clinic');

        $this->getJson($availabilityUrl)
            ->assertOk()
            ->assertJsonMissing(['starts_at' => $slotStart->toIso8601String()]);

        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->toIso8601String(),
        ])->assertConflict();

        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->subHour()->toIso8601String(),
        ])->assertConflict();

        $this->assertDatabaseHas('appointments', [
            'patient_id' => $patient->id,
            'doctor_profile_id' => $profile->id,
            'status' => 'confirmed',
        ]);
        $this->assertSame(1, Appointment::count());
        $this->assertSame($doctor->id, $profile->user_id);
    }

    public function test_patient_and_doctor_appointment_lists_are_scoped_to_the_authenticated_user(): void
    {
        [$doctor, $profile, $slotStart] = $this->createBookableDoctor();
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        $otherPatient = User::factory()->create(['role' => UserRole::Patient]);

        Appointment::create([
            'patient_id' => $patient->id,
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart,
            'ends_at' => $slotStart->addMinutes(30),
            'status' => 'confirmed',
            'service_type' => 'clinic',
        ]);

        Sanctum::actingAs($patient);
        $this->getJson('/api/v1/patient/appointments')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/doctor/appointments')->assertForbidden();

        Sanctum::actingAs($otherPatient);
        $this->getJson('/api/v1/patient/appointments')->assertOk()->assertJsonCount(0, 'data');

        Sanctum::actingAs($doctor);
        $this->getJson('/api/v1/doctor/appointments')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.patient.id', $patient->id);
        $this->getJson('/api/v1/patient/appointments')->assertForbidden();
    }

    public function test_schedule_replacement_preserves_existing_appointments(): void
    {
        [$doctor, $profile, $slotStart] = $this->createBookableDoctor();
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart,
            'ends_at' => $slotStart->addMinutes(30),
            'status' => 'confirmed',
            'service_type' => 'clinic',
        ]);

        Sanctum::actingAs($doctor);
        $this->putJson('/api/v1/doctor/schedule', ['periods' => [[
            'day_of_week' => $slotStart->dayOfWeek,
            'start_time' => '13:00',
            'end_time' => '15:00',
            'slot_duration_minutes' => 60,
        ]]])->assertOk();

        $this->assertDatabaseHas('appointments', ['id' => $appointment->id]);
        $schedule = DoctorAvailabilitySchedule::query()->where('doctor_profile_id', $profile->id)->sole();
        $this->assertSame('13:00', substr($schedule->start_time, 0, 5));
        $this->assertSame(60, $schedule->slot_duration_minutes);
        $this->getJson('/api/v1/doctor/resolved-availability')
            ->assertOk()
            ->assertJsonPath('data.timezone', config('app.timezone'));
    }

    public function test_unverified_doctors_and_blocked_times_cannot_be_booked(): void
    {
        [, $profile, $slotStart] = $this->createBookableDoctor();
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);

        DoctorAvailabilityException::create([
            'doctor_profile_id' => $profile->id,
            'exception_date' => $slotStart->toDateString(),
            'type' => 'blocked',
            'start_time' => '09:00',
            'end_time' => '09:30',
        ]);

        $resolved = app(AvailabilityResolver::class)->resolve(
            $profile->fresh(),
            $slotStart->startOfDay(),
            $slotStart->startOfDay(),
        );
        $this->assertNotContains($slotStart->toIso8601String(), collect($resolved)->flatMap(fn ($day) => $day['slots'])->pluck('starts_at'));

        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->toIso8601String(),
        ])->assertConflict();

        $profile->update(['verification_status' => 'pending']);
        $this->getJson("/api/v1/patient/doctors/{$profile->id}/availability")
            ->assertNotFound();
        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->addMinutes(30)->toIso8601String(),
        ])->assertNotFound();
    }

    /** @return array{User, DoctorProfile, CarbonImmutable} */
    private function createBookableDoctor(): array
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor]);
        $specialization = Specialization::query()->firstOrFail();
        $location = Location::query()->firstOrFail();
        $profile = DoctorProfile::create([
            'user_id' => $doctor->id,
            'specialization_id' => $specialization->id,
            'location_id' => $location->id,
            'clinic_name' => 'Test Clinic',
            'profile_image_path' => 'profile-photos/doctors/test.jpg',
            'verification_status' => 'verified',
        ]);
        $slotStart = CarbonImmutable::now(config('app.timezone'))
            ->addDays(2)
            ->startOfDay()
            ->setTime(9, 0);
        DoctorAvailabilitySchedule::create([
            'doctor_profile_id' => $profile->id,
            'day_of_week' => $slotStart->dayOfWeek,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'slot_duration_minutes' => 30,
            'is_active' => true,
        ]);

        return [$doctor, $profile, $slotStart];
    }
}
