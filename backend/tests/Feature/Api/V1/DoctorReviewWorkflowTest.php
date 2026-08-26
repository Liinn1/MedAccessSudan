<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\DoctorReview;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DoctorReviewWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_assigned_doctor_can_complete_past_confirmed_appointment_only_once(): void
    {
        [$doctor, $patient, $appointment] = $this->scenario('confirmed');
        Sanctum::actingAs($doctor->user);
        $this->patchJson("/api/v1/doctor/appointments/{$appointment->id}/complete")->assertOk()->assertJsonPath('data.status', 'completed');
        $this->patchJson("/api/v1/doctor/appointments/{$appointment->id}/complete")->assertConflict();
        $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'completed']);

        Sanctum::actingAs($patient);
        $this->patchJson("/api/v1/doctor/appointments/{$appointment->id}/complete")->assertForbidden();
    }

    public function test_another_doctor_cannot_complete_the_appointment(): void
    {
        [, , $appointment] = $this->scenario('confirmed');
        Sanctum::actingAs($this->doctor()->user);
        $this->patchJson("/api/v1/doctor/appointments/{$appointment->id}/complete")->assertNotFound();
    }

    public function test_only_owned_completed_appointment_can_be_reviewed_once(): void
    {
        [, $patient, $appointment] = $this->scenario('completed');
        Sanctum::actingAs($patient);
        $this->postJson("/api/v1/patient/appointments/{$appointment->id}/review", ['rating' => 5])
            ->assertCreated()->assertJsonPath('data.rating', 5)->assertJsonPath('data.comment', null);
        $this->postJson("/api/v1/patient/appointments/{$appointment->id}/review", ['rating' => 4])->assertConflict();

        [, $confirmedPatient, $confirmed] = $this->scenario('confirmed');
        Sanctum::actingAs($confirmedPatient);
        $this->postJson("/api/v1/patient/appointments/{$confirmed->id}/review", ['rating' => 5])->assertConflict();

        [, $cancelledPatient, $cancelled] = $this->scenario('cancelled');
        Sanctum::actingAs($cancelledPatient);
        $this->postJson("/api/v1/patient/appointments/{$cancelled->id}/review", ['rating' => 5])->assertConflict();
    }

    public function test_review_rating_validation_and_optional_comment(): void
    {
        [, $patient, $appointment] = $this->scenario('completed');
        Sanctum::actingAs($patient);
        $this->postJson("/api/v1/patient/appointments/{$appointment->id}/review", ['rating' => 0])->assertJsonValidationErrors('rating');
        $this->postJson("/api/v1/patient/appointments/{$appointment->id}/review", ['rating' => 6])->assertJsonValidationErrors('rating');
        $this->postJson("/api/v1/patient/appointments/{$appointment->id}/review", ['rating' => 4, 'comment' => 'Helpful visit.'])->assertCreated();
    }

    public function test_patient_cannot_review_another_patients_appointment(): void
    {
        [, , $appointment] = $this->scenario('completed');
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient]));
        $this->postJson("/api/v1/patient/appointments/{$appointment->id}/review", ['rating' => 5])->assertNotFound();
    }

    public function test_doctor_and_unauthenticated_user_cannot_submit_reviews(): void
    {
        [$doctor, , $appointment] = $this->scenario('completed');
        Sanctum::actingAs($doctor->user);
        $this->postJson("/api/v1/patient/appointments/{$appointment->id}/review", ['rating' => 5])->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->postJson("/api/v1/patient/appointments/{$appointment->id}/review", ['rating' => 5])->assertUnauthorized();
    }

    public function test_featured_doctors_require_three_reviews_and_rank_by_average_then_count(): void
    {
        config()->set('medaccess.featured_doctor_min_reviews', 3);
        $high = $this->doctor();
        $volume = $this->doctor();
        $excluded = $this->doctor();
        $this->reviews($high, [5, 5, 5]);
        $this->reviews($volume, [4, 5, 5, 5]);
        $this->reviews($excluded, [5, 5]);

        $this->getJson('/api/v1/doctors/featured')->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $high->id)->assertJsonPath('data.0.average_rating', 5)
            ->assertJsonPath('data.0.review_count', 3)->assertJsonPath('data.1.id', $volume->id);
    }

    public function test_unverified_or_suspended_doctor_is_not_featured(): void
    {
        config()->set('medaccess.demo_auto_verify_doctors', false);
        $doctor = $this->doctor('suspended');
        $this->reviews($doctor, [5, 5, 5]);
        $this->getJson('/api/v1/doctors/featured')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_review_count_breaks_equal_average_rating_ties(): void
    {
        config()->set('medaccess.featured_doctor_min_reviews', 3);
        $moreReviews = $this->doctor();
        $fewerReviews = $this->doctor();
        $this->reviews($moreReviews, [4, 4, 4, 4]);
        $this->reviews($fewerReviews, [4, 4, 4]);

        $this->getJson('/api/v1/doctors/featured')->assertOk()
            ->assertJsonPath('data.0.id', $moreReviews->id)
            ->assertJsonPath('data.1.id', $fewerReviews->id);
    }

    public function test_new_review_changes_subsequent_featured_results(): void
    {
        config()->set('medaccess.featured_doctor_min_reviews', 3);
        $doctor = $this->doctor();
        $this->reviews($doctor, [5, 5]);
        $this->getJson('/api/v1/doctors/featured')->assertJsonCount(0, 'data');
        $this->reviews($doctor, [5]);
        $this->getJson('/api/v1/doctors/featured')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $doctor->id);
    }

    public function test_demo_threshold_features_one_legitimate_completed_appointment_review(): void
    {
        config()->set('medaccess.featured_doctor_min_reviews', 1);
        $doctor = $this->doctor();
        $this->reviews($doctor, [5]);

        $this->getJson('/api/v1/doctors/featured')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $doctor->id)
            ->assertJsonPath('data.0.average_rating', 5)
            ->assertJsonPath('data.0.review_count', 1);
    }

    private function scenario(string $status): array
    {
        $doctor = $this->doctor();
        $patient = User::factory()->create(['role' => UserRole::Patient]);
        $appointment = Appointment::create(['patient_id' => $patient->id, 'doctor_profile_id' => $doctor->id, 'starts_at' => CarbonImmutable::now()->subHour(), 'ends_at' => CarbonImmutable::now()->subMinutes(30), 'status' => $status, 'service_type' => 'clinic']);

        return [$doctor, $patient, $appointment];
    }

    private function doctor(string $status = 'verified'): DoctorProfile
    {
        return DoctorProfile::create(['user_id' => User::factory()->create(['role' => UserRole::Doctor])->id, 'specialization_id' => Specialization::query()->firstOrFail()->id, 'location_id' => Location::query()->firstOrFail()->id, 'verification_status' => $status]);
    }

    private function reviews(DoctorProfile $doctor, array $ratings): void
    {
        foreach ($ratings as $index => $rating) {
            $patient = User::factory()->create(['role' => UserRole::Patient]);
            $start = CarbonImmutable::now()->subDays(count($ratings) + 1)->addHours($index);
            $appointment = Appointment::create(['patient_id' => $patient->id, 'doctor_profile_id' => $doctor->id, 'starts_at' => $start, 'ends_at' => $start->addMinutes(30), 'status' => 'completed', 'service_type' => 'clinic']);
            DoctorReview::create(['appointment_id' => $appointment->id, 'patient_id' => $patient->id, 'doctor_profile_id' => $doctor->id, 'rating' => $rating]);
        }
    }
}
