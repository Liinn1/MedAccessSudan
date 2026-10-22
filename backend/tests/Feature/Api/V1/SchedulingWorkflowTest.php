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
            'payment_method' => 'pay_later',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.service_type', 'clinic');

        $this->getJson($availabilityUrl)
            ->assertOk()
            ->assertJsonMissing(['starts_at' => $slotStart->toIso8601String()]);

        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->toIso8601String(),
            'payment_method' => 'pay_later',
        ])->assertConflict();

        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->subHour()->toIso8601String(),
            'payment_method' => 'pay_later',
        ])->assertConflict();

        $this->assertDatabaseHas('appointments', [
            'patient_id' => $patient->id,
            'doctor_profile_id' => $profile->id,
            'status' => 'confirmed',
        ]);
        $this->assertSame(1, Appointment::count());
        $this->assertSame($doctor->id, $profile->user_id);
    }

    public function test_1120_sudan_slot_is_preserved_through_availability_booking_database_and_api(): void
    {
        [, $profile, $slotStart] = $this->createBookableDoctor(11, 20);
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);

        $availabilityUrl = "/api/v1/patient/doctors/{$profile->id}/availability?from={$slotStart->toDateString()}&to={$slotStart->toDateString()}";
        $this->getJson($availabilityUrl)
            ->assertOk()
            ->assertJsonFragment(['starts_at' => $slotStart->toIso8601String()]);

        $response = $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->toIso8601String(),
            'payment_method' => 'pay_later',
        ])->assertCreated()
            ->assertJsonPath('data.starts_at', $slotStart->toIso8601String());

        $appointment = Appointment::query()->findOrFail($response->json('data.id'));
        $this->assertSame($slotStart->format('Y-m-d H:i:s'), $appointment->getRawOriginal('starts_at'));
        $this->assertSame('11:20', $appointment->starts_at->setTimezone(config('app.timezone'))->format('H:i'));
    }

    public function test_home_visit_booking_enforces_and_snapshots_the_selected_city(): void
    {
        [, $profile, $slotStart] = $this->createBookableDoctor();
        $khartoum = Location::query()->where('code', 'SD-KH')->firstOrFail();
        $omdurman = Location::query()->where('code', 'SD-GZ')->firstOrFail();
        $profile->update(['offers_home_visits' => true, 'home_visit_location_id' => $khartoum->id]);
        DoctorAvailabilitySchedule::create([
            'doctor_profile_id' => $profile->id,
            'consultation_type' => 'home_visit',
            'day_of_week' => $slotStart->dayOfWeek,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'slot_duration_minutes' => 30,
            'is_active' => true,
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient]));
        $payload = [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->toIso8601String(),
            'service_type' => 'home_visit',
            'payment_method' => 'pay_later',
            'home_visit' => ['contact_phone' => '+249912345678', 'area' => 'Al Riyadh', 'address_details' => 'House 12', 'latitude' => 15.5000000, 'longitude' => 32.5000000],
        ];

        $this->postJson('/api/v1/patient/appointments', [...$payload, 'home_visit' => [...$payload['home_visit'], 'city' => $omdurman->code]])
            ->assertUnprocessable();
        $this->postJson('/api/v1/patient/appointments', [...$payload, 'home_visit' => [...$payload['home_visit'], 'city' => $khartoum->code]])
            ->assertCreated()
            ->assertJsonPath('data.home_visit.city.code', 'SD-KH')
            ->assertJsonMissingPath('data.home_visit.latitude')
            ->assertJsonMissingPath('data.home_visit.longitude');
        $this->assertDatabaseHas('home_visit_details', ['location_id' => $khartoum->id, 'area' => 'Al Riyadh']);
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
        $this->putJson('/api/v1/doctor/schedule', ['consultation_type' => 'clinic', 'periods' => [[
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
            'payment_method' => 'pay_later',
        ])->assertConflict();

        $profile->update(['verification_status' => 'pending_documents']);
        $this->getJson("/api/v1/patient/doctors/{$profile->id}/availability")
            ->assertNotFound();
        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->addMinutes(30)->toIso8601String(),
            'payment_method' => 'pay_later',
        ])->assertNotFound();
    }

    /** @return array{User, DoctorProfile, CarbonImmutable} */
    private function createBookableDoctor(int $hour = 9, int $minute = 0): array
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
            ->setTime($hour, $minute);
        DoctorAvailabilitySchedule::create([
            'doctor_profile_id' => $profile->id,
            'day_of_week' => $slotStart->dayOfWeek,
            'start_time' => $slotStart->format('H:i'),
            'end_time' => $slotStart->addHours(2)->format('H:i'),
            'slot_duration_minutes' => 30,
            'is_active' => true,
        ]);

        return [$doctor, $profile, $slotStart];
    }
}
