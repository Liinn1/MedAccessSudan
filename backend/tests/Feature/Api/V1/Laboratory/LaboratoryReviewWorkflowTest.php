<?php

namespace Tests\Feature\Api\V1\Laboratory;

use App\Enums\DoctorVerificationStatus;
use App\Enums\LaboratoryCollectionMethod;
use App\Enums\UserRole;
use App\Models\LabTest;
use App\Models\LaboratoryProfile;
use App\Models\Location;
use App\Models\ProviderReview;
use App\Models\User;
use Database\Seeders\LabTestCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LaboratoryReviewWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LabTestCatalogSeeder::class);
        Storage::fake('local');
    }

    public function test_visit_laboratory_order_becomes_rateable_only_after_result_release(): void
    {
        [$lab, $cbc] = $this->laboratoryWithTest();
        $patient = $this->patient();
        $orderId = $this->book($patient, $lab, $cbc);

        $this->getJson("/api/v1/patient/laboratory-orders/{$orderId}")->assertOk()
            ->assertJsonPath('data.can_review', false)->assertJsonPath('data.review', null);
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 5])->assertConflict();

        $this->advance($lab, $orderId, ['sample_collected', 'in_progress']);
        Sanctum::actingAs($patient);
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 5])->assertConflict();

        $this->releaseResult($lab, $orderId);
        Sanctum::actingAs($patient);
        $this->getJson("/api/v1/patient/laboratory-orders/{$orderId}")->assertOk()->assertJsonPath('data.can_review', true);
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 4, 'comment' => 'Quick results.'])
            ->assertCreated()->assertJsonPath('data.rating', 4)->assertJsonPath('data.comment', 'Quick results.');
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 1])->assertConflict();

        $this->getJson("/api/v1/patient/laboratory-orders/{$orderId}")->assertOk()
            ->assertJsonPath('data.can_review', false)->assertJsonPath('data.review.rating', 4);
        $this->assertDatabaseHas('provider_reviews', [
            'laboratory_order_id' => $orderId,
            'laboratory_profile_id' => $lab['profile']->id,
            'patient_id' => $patient->id,
            'appointment_id' => null,
            'doctor_profile_id' => null,
        ]);

        $match = $this->getJson('/api/v1/patient/laboratory-offerings?'.http_build_query(['lab_test_ids' => [$cbc->id]]))
            ->assertOk()->json('data.matches.complete.0');
        $this->assertSame($lab['profile']->id, $match['laboratory_profile_id']);
        $this->assertEquals(4, $match['average_rating']);
        $this->assertSame(1, $match['review_count']);
    }

    public function test_home_collection_order_is_rated_into_the_same_laboratory_aggregate(): void
    {
        [$lab, $cbc] = $this->laboratoryWithTest(home: true);
        $first = $this->patient('first@example.com');
        $firstOrder = $this->book($first, $lab, $cbc);
        $this->advance($lab, $firstOrder, ['sample_collected', 'in_progress']);
        $this->releaseResult($lab, $firstOrder);
        Sanctum::actingAs($first);
        $this->postJson("/api/v1/patient/laboratory-orders/{$firstOrder}/review", ['rating' => 5])->assertCreated();

        $second = $this->patient('second@example.com');
        $homeOrder = $this->book($second, $lab, $cbc, home: true);
        $this->postJson("/api/v1/patient/laboratory-orders/{$homeOrder}/review", ['rating' => 3])->assertConflict();
        $this->advance($lab, $homeOrder, ['sample_collected', 'in_progress']);
        $this->releaseResult($lab, $homeOrder);
        Sanctum::actingAs($second);
        $this->postJson("/api/v1/patient/laboratory-orders/{$homeOrder}/review", ['rating' => 3])->assertCreated();

        $profile = LaboratoryProfile::query()->withRatingSummary()->findOrFail($lab['profile']->id);
        $this->assertSame(['average_rating' => 4.0, 'review_count' => 2], $profile->ratingSummary());
        $this->assertSame($lab['profile']->id, LaboratoryProfile::query()->visibleToPatients()->topRated(2)->value('id'));
    }

    public function test_patient_cannot_rate_another_patients_laboratory_order_and_guests_are_rejected(): void
    {
        [$lab, $cbc] = $this->laboratoryWithTest();
        $owner = $this->patient('owner@example.com');
        $orderId = $this->book($owner, $lab, $cbc);
        $this->advance($lab, $orderId, ['sample_collected', 'in_progress']);
        $this->releaseResult($lab, $orderId);

        Sanctum::actingAs($this->patient('intruder@example.com'));
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 1])->assertNotFound();

        Sanctum::actingAs($lab['user']);
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 5])->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 5])->assertUnauthorized();
        $this->assertSame(0, ProviderReview::query()->count());
    }

    public function test_submitted_provider_ids_are_ignored_in_favour_of_the_order(): void
    {
        [$lab, $cbc] = $this->laboratoryWithTest();
        [$other] = $this->laboratoryWithTest('other.lab@example.com', 'Other Lab');
        $patient = $this->patient();
        $orderId = $this->book($patient, $lab, $cbc);
        $this->advance($lab, $orderId, ['sample_collected', 'in_progress']);
        $this->releaseResult($lab, $orderId);

        Sanctum::actingAs($patient);
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", [
            'rating' => 5,
            'laboratory_profile_id' => $other['profile']->id,
            'doctor_profile_id' => 999,
        ])->assertCreated();

        $this->assertDatabaseHas('provider_reviews', ['laboratory_order_id' => $orderId, 'laboratory_profile_id' => $lab['profile']->id, 'doctor_profile_id' => null]);
        $this->assertDatabaseMissing('provider_reviews', ['laboratory_profile_id' => $other['profile']->id]);
    }

    public function test_rating_validation_matches_doctor_rules(): void
    {
        [$lab, $cbc] = $this->laboratoryWithTest();
        $patient = $this->patient();
        $orderId = $this->book($patient, $lab, $cbc);
        $this->advance($lab, $orderId, ['sample_collected', 'in_progress']);
        $this->releaseResult($lab, $orderId);

        Sanctum::actingAs($patient);
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 0])->assertJsonValidationErrors('rating');
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 6])->assertJsonValidationErrors('rating');
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 5, 'comment' => str_repeat('a', 2001)])->assertJsonValidationErrors('comment');
    }

    public function test_suspended_laboratory_is_hidden_from_selection_but_keeps_reviews(): void
    {
        [$lab, $cbc] = $this->laboratoryWithTest();
        $patient = $this->patient();
        $orderId = $this->book($patient, $lab, $cbc);
        $this->advance($lab, $orderId, ['sample_collected', 'in_progress']);
        $this->releaseResult($lab, $orderId);
        Sanctum::actingAs($patient);
        $this->postJson("/api/v1/patient/laboratory-orders/{$orderId}/review", ['rating' => 5])->assertCreated();

        $lab['user']->update(['is_active' => false]);
        $this->getJson('/api/v1/patient/laboratory-offerings?'.http_build_query(['lab_test_ids' => [$cbc->id]]))
            ->assertOk()->assertJsonCount(0, 'data.matches.complete');
        $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
        ])->assertUnprocessable()->assertJsonPath('code', 'LABORATORY_UNAVAILABLE');
        $this->assertSame(1, ProviderReview::query()->where('laboratory_profile_id', $lab['profile']->id)->count());
    }

    /** @return array{0: array{user: User, profile: LaboratoryProfile}, 1: LabTest} */
    private function laboratoryWithTest(string $email = 'lab@example.com', string $name = 'Nile Diagnostics', bool $home = false): array
    {
        $user = User::factory()->create([
            'name' => $name,
            'email' => $email,
            'role' => UserRole::Laboratory,
            'phone' => '09'.sprintf('%08d', abs(crc32($email)) % 100000000),
        ]);
        $profile = $user->laboratoryProfile()->create([
            'name' => $name,
            'address' => 'Near Al Riyadh',
            'location_id' => Location::query()->where('code', 'SD-KH')->valueOrFail('id'),
            'verification_status' => DoctorVerificationStatus::Verified->value,
            'supports_home_collection' => $home,
        ]);
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        Sanctum::actingAs($user);
        $this->putJson("/api/v1/laboratory/offerings/{$cbc->id}", ['price' => '150.00', 'estimated_turnaround_hours' => 2, 'is_available' => true])->assertOk();

        return [['user' => $user, 'profile' => $profile], $cbc];
    }

    private function patient(string $email = 'patient@example.com'): User
    {
        return User::factory()->create([
            'role' => UserRole::Patient,
            'email' => $email,
            'phone' => '09'.sprintf('%08d', abs(crc32($email)) % 100000000),
        ]);
    }

    /** @param  array{user: User, profile: LaboratoryProfile}  $lab */
    private function book(User $patient, array $lab, LabTest $test, bool $home = false): int
    {
        Sanctum::actingAs($patient);

        return $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$test->id],
            'payment_method' => 'pay_later',
            ...($home ? [
                'collection_method' => LaboratoryCollectionMethod::HomeCollection->value,
                'collection_location_id' => Location::query()->where('code', 'SD-KH')->valueOrFail('id'),
                'collection_area' => 'Al Riyadh',
                'collection_address' => 'Building 12',
                'collection_starts_at' => now()->addDay()->toIso8601String(),
                'collection_latitude' => 15.5,
                'collection_longitude' => 32.5,
            ] : []),
        ])->assertCreated()->json('data.id');
    }

    /** @param  array{user: User, profile: LaboratoryProfile}  $lab */
    private function advance(array $lab, int $orderId, array $statuses): void
    {
        Sanctum::actingAs($lab['user']);
        foreach ($statuses as $status) {
            $this->patchJson("/api/v1/laboratory/orders/{$orderId}/status", ['status' => $status])->assertOk();
        }
    }

    /** @param  array{user: User, profile: LaboratoryProfile}  $lab */
    private function releaseResult(array $lab, int $orderId): void
    {
        Sanctum::actingAs($lab['user']);
        $path = tempnam(sys_get_temp_dir(), 'labpdf');
        file_put_contents($path, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
        $this->post("/api/v1/laboratory/orders/{$orderId}/result", [
            'result' => new UploadedFile($path, 'result.pdf', 'application/pdf', null, true),
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.status', 'result_ready');
    }
}
