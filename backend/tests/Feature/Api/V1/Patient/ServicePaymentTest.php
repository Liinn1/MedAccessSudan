<?php

namespace Tests\Feature\Api\V1\Patient;

use App\Enums\DoctorVerificationStatus;
use App\Enums\UserRole;
use App\Models\DoctorAvailabilitySchedule;
use App\Models\DoctorProfile;
use App\Models\LabTest;
use App\Models\Location;
use App\Models\Payment;
use App\Models\Specialization;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ServicePaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_appointment_booking_requires_payment_method_and_rejects_card_payload(): void
    {
        [$patient, $profile, $slotStart] = $this->bookableClinic();
        Sanctum::actingAs($patient);

        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->toIso8601String(),
        ])->assertUnprocessable()->assertJsonValidationErrors('payment_method');

        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->toIso8601String(),
            'payment_method' => 'pay_later',
            'card_number' => '4111111111111111',
            'cvv' => '123',
        ])->assertUnprocessable()->assertJsonValidationErrors(['card_number', 'cvv']);
    }

    public function test_pay_later_appointment_records_unpaid_payment_without_invented_price(): void
    {
        [$patient, $profile, $slotStart] = $this->bookableClinic();
        Sanctum::actingAs($patient);

        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->toIso8601String(),
            'payment_method' => 'pay_later',
        ])->assertCreated()
            ->assertJsonPath('data.payment.method', 'pay_later')
            ->assertJsonPath('data.payment.status', 'unpaid')
            ->assertJsonPath('data.payment.amount', null);

        $this->assertDatabaseHas('payments', [
            'patient_id' => $patient->id,
            'method' => 'pay_later',
            'status' => 'unpaid',
        ]);
        $this->assertTrue(Payment::query()->where('patient_id', $patient->id)->whereNull('amount')->exists());
    }

    public function test_card_method_stores_development_pending_state_not_a_charge(): void
    {
        [$patient, $profile, $slotStart] = $this->bookableClinic();
        Sanctum::actingAs($patient);

        $this->postJson('/api/v1/patient/appointments', [
            'doctor_profile_id' => $profile->id,
            'starts_at' => $slotStart->toIso8601String(),
            'payment_method' => 'card',
        ])->assertCreated()
            ->assertJsonPath('data.payment.method', 'card')
            ->assertJsonPath('data.payment.status', 'pending');

        $this->assertDatabaseHas('payments', [
            'patient_id' => $patient->id,
            'method' => 'card',
            'status' => 'pending',
            'provider' => 'development',
            'provider_reference' => null,
        ]);
    }

    public function test_laboratory_order_snapshots_server_side_amount_for_payment(): void
    {
        $labUser = User::factory()->create(['role' => UserRole::Laboratory, 'email' => 'pay.lab@example.com']);
        $profile = $labUser->laboratoryProfile()->create([
            'name' => 'Pay Lab',
            'address' => 'Khartoum',
            'location_id' => Location::query()->where('code', 'khartoum')->valueOrFail('id'),
            'verification_status' => DoctorVerificationStatus::Verified->value,
        ]);
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        Sanctum::actingAs($labUser);
        $this->putJson("/api/v1/laboratory/offerings/{$cbc->id}", [
            'price' => '150.00',
            'estimated_turnaround_hours' => 2,
            'is_available' => true,
        ])->assertOk();

        $patient = User::factory()->create(['role' => UserRole::Patient]);
        Sanctum::actingAs($patient);
        $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $profile->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
        ])->assertCreated()
            ->assertJsonPath('data.payment.method', 'pay_later')
            ->assertJsonPath('data.payment.status', 'unpaid')
            ->assertJsonPath('data.payment.amount', '150.00')
            ->assertJsonPath('data.payment.currency', 'SDG');
    }

    /** @return array{0: User, 1: DoctorProfile, 2: CarbonImmutable} */
    private function bookableClinic(): array
    {
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        $profile = DoctorProfile::create([
            'user_id' => User::factory()->create(['role' => UserRole::Doctor])->id,
            'specialization_id' => Specialization::query()->firstOrFail()->id,
            'location_id' => Location::query()->firstOrFail()->id,
            'clinic_name' => 'Payment Clinic',
            'verification_status' => 'verified',
        ]);
        $slotStart = CarbonImmutable::now(config('app.timezone'))->addDays(2)->startOfDay()->setTime(9, 0);
        DoctorAvailabilitySchedule::create([
            'doctor_profile_id' => $profile->id,
            'day_of_week' => $slotStart->dayOfWeek,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'slot_duration_minutes' => 30,
            'is_active' => true,
        ]);

        return [$patient, $profile, $slotStart];
    }
}
