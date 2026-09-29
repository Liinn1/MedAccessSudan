<?php

namespace Tests\Feature\Api\V1\Laboratory;

use App\Enums\DoctorVerificationStatus;
use App\Enums\LaboratoryOrderStatus;
use App\Enums\UserRole;
use App\Models\LabTest;
use App\Models\LaboratoryOffering;
use App\Models\LaboratoryProfile;
use App\Models\Location;
use App\Models\User;
use Database\Seeders\LabTestCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LaboratoryWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LabTestCatalogSeeder::class);
    }

    public function test_catalog_loads_and_search_finds_cbc(): void
    {
        Sanctum::actingAs($this->laboratory()['user']);

        $this->getJson('/api/v1/laboratory/catalog')
            ->assertOk()
            ->assertJsonPath('data.categories.0.slug', 'hematology');

        $this->getJson('/api/v1/laboratory/catalog?q=CBC')
            ->assertOk()
            ->assertJsonFragment(['short_name' => 'CBC']);
    }

    public function test_laboratory_enables_test_with_validated_price_and_can_disable_without_deletion(): void
    {
        ['user' => $user, 'profile' => $profile] = $this->laboratory();
        Sanctum::actingAs($user);
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();

        $this->putJson("/api/v1/laboratory/offerings/{$cbc->id}", [
            'price' => '0',
            'estimated_turnaround_hours' => 2,
            'is_available' => true,
        ])->assertUnprocessable();

        $this->putJson("/api/v1/laboratory/offerings/{$cbc->id}", [
            'price' => '150.00',
            'estimated_turnaround_hours' => 2,
            'is_available' => true,
        ])->assertOk()->assertJsonPath('data.currency', 'SDG');

        $this->putJson("/api/v1/laboratory/offerings/{$cbc->id}", [
            'price' => '150.00',
            'estimated_turnaround_hours' => 2,
            'is_available' => true,
        ])->assertOk();

        $this->assertSame(1, LaboratoryOffering::query()->where('laboratory_profile_id', $profile->id)->where('lab_test_id', $cbc->id)->count());

        $this->putJson("/api/v1/laboratory/offerings/{$cbc->id}", [
            'price' => '175.00',
            'estimated_turnaround_hours' => 4,
            'is_available' => false,
        ])->assertOk();

        $offering = LaboratoryOffering::query()->where('laboratory_profile_id', $profile->id)->where('lab_test_id', $cbc->id)->firstOrFail();
        $this->assertFalse($offering->is_available);
        $this->assertSame('175.00', $offering->price);
    }

    public function test_another_laboratory_cannot_modify_or_see_foreign_orders(): void
    {
        $labA = $this->laboratory('nile.lab@example.com', 'Nile Lab');
        $labB = $this->laboratory('blue.lab@example.com', 'Blue Lab');
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($labA['user'], $cbc);
        $patient = $this->patient();
        Sanctum::actingAs($patient);
        $orderId = $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $labA['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($labB['user']);
        $this->getJson("/api/v1/laboratory/orders/{$orderId}")->assertNotFound();
        $this->patchJson("/api/v1/laboratory/orders/{$orderId}/status", [
            'status' => LaboratoryOrderStatus::SampleCollected->value,
        ])->assertNotFound();

        $this->putJson("/api/v1/laboratory/offerings/{$cbc->id}", [
            'price' => '10.00',
            'estimated_turnaround_hours' => 1,
            'is_available' => true,
        ])->assertOk();

        $this->assertSame('150.00', LaboratoryOffering::query()->where('laboratory_profile_id', $labA['profile']->id)->where('lab_test_id', $cbc->id)->value('price'));
        $this->assertSame('10.00', LaboratoryOffering::query()->where('laboratory_profile_id', $labB['profile']->id)->where('lab_test_id', $cbc->id)->value('price'));
    }

    public function test_order_status_workflow_and_result_authorization(): void
    {
        Storage::fake('local');
        $lab = $this->laboratory();
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($lab['user'], $cbc);
        $patientA = $this->patient('patient.a@example.com');
        $patientB = $this->patient('patient.b@example.com');

        Sanctum::actingAs($patientA);
        $orderId = $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($lab['user']);
        $this->patchJson("/api/v1/laboratory/orders/{$orderId}/status", [
            'status' => LaboratoryOrderStatus::ResultReady->value,
        ])->assertUnprocessable()->assertJsonPath('code', 'INVALID_STATUS_TRANSITION');

        $this->patchJson("/api/v1/laboratory/orders/{$orderId}/status", [
            'status' => LaboratoryOrderStatus::SampleCollected->value,
        ])->assertOk()->assertJsonPath('data.status', 'sample_collected');

        $this->patchJson("/api/v1/laboratory/orders/{$orderId}/status", [
            'status' => LaboratoryOrderStatus::InProgress->value,
        ])->assertOk();

        $this->post("/api/v1/laboratory/orders/{$orderId}/result", [
            'result' => $this->pdfUpload(),
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.status', 'result_ready');

        $this->assertDatabaseHas('laboratory_results', ['laboratory_order_id' => $orderId]);

        Sanctum::actingAs($patientA);
        $this->getJson('/api/v1/patient/laboratory-orders')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'result_ready');
        $this->get("/api/v1/patient/laboratory-orders/{$orderId}/result")->assertOk();

        Sanctum::actingAs($patientB);
        $this->get("/api/v1/patient/laboratory-orders/{$orderId}/result")->assertNotFound();
        $this->getJson("/api/v1/patient/laboratory-orders/{$orderId}")->assertNotFound();
    }

    public function test_invalid_and_oversized_result_files_are_rejected(): void
    {
        Storage::fake('local');
        $lab = $this->laboratory();
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($lab['user'], $cbc);
        $patient = $this->patient();
        Sanctum::actingAs($patient);
        $orderId = $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
        ])->json('data.id');

        Sanctum::actingAs($lab['user']);
        $this->patchJson("/api/v1/laboratory/orders/{$orderId}/status", ['status' => 'sample_collected']);
        $this->patchJson("/api/v1/laboratory/orders/{$orderId}/status", ['status' => 'in_progress']);

        $this->post("/api/v1/laboratory/orders/{$orderId}/result", [
            'result' => UploadedFile::fake()->create('notes.txt', 20, 'text/plain'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->post("/api/v1/laboratory/orders/{$orderId}/result", [
            'result' => UploadedFile::fake()->create('huge.pdf', 9000, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->post("/api/v1/laboratory/orders/{$orderId}/result", [
            'result' => UploadedFile::fake()->image('scan.png'),
        ], ['Accept' => 'application/json'])->assertOk();
    }

    public function test_unavailable_offering_cannot_be_requested(): void
    {
        $lab = $this->laboratory();
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        Sanctum::actingAs($lab['user']);
        $this->putJson("/api/v1/laboratory/offerings/{$cbc->id}", [
            'price' => '80.00',
            'estimated_turnaround_hours' => 24,
            'is_available' => false,
        ])->assertOk();

        Sanctum::actingAs($this->patient());
        $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
        ])->assertUnprocessable()->assertJsonPath('code', 'TEST_UNAVAILABLE');
    }

    public function test_patient_catalog_exposes_min_price_and_laboratory_count(): void
    {
        $labA = $this->laboratory('nile.lab@example.com', 'Nile Lab');
        $labB = $this->laboratory('blue.lab@example.com', 'Blue Lab');
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($labA['user'], $cbc);
        Sanctum::actingAs($labB['user']);
        $this->putJson("/api/v1/laboratory/offerings/{$cbc->id}", [
            'price' => '80.00',
            'estimated_turnaround_hours' => 4,
            'is_available' => true,
        ])->assertOk();

        Sanctum::actingAs($this->patient());
        $this->getJson('/api/v1/patient/laboratory-offerings?q=CBC')
            ->assertOk()
            ->assertJsonPath('data.tests.0.short_name', 'CBC')
            ->assertJsonPath('data.tests.0.laboratory_count', 2)
            ->assertJsonPath('data.tests.0.min_price', '80.00')
            ->assertJsonPath('data.tests.0.currency', 'SDG');
    }

    public function test_matching_prefers_laboratories_that_offer_all_selected_tests(): void
    {
        $labA = $this->laboratory('nile.lab@example.com', 'Nile Lab');
        $labB = $this->laboratory('blue.lab@example.com', 'Blue Lab');
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $hba1c = LabTest::query()->where('slug', 'hba1c')->firstOrFail();
        $this->enable($labA['user'], $cbc);
        $this->enable($labA['user'], $hba1c);
        $this->enable($labB['user'], $cbc);

        Sanctum::actingAs($this->patient());
        $response = $this->getJson('/api/v1/patient/laboratory-offerings?'.http_build_query([
            'lab_test_ids' => [$cbc->id, $hba1c->id],
        ]))->assertOk();

        $this->assertCount(1, $response->json('data.matches.complete'));
        $this->assertSame($labA['profile']->id, $response->json('data.matches.complete.0.laboratory_profile_id'));
        $this->assertTrue($response->json('data.matches.complete.0.offers_all'));
        $this->assertCount(1, $response->json('data.matches.partial'));
        $this->assertSame($labB['profile']->id, $response->json('data.matches.partial.0.laboratory_profile_id'));
        $this->assertFalse($response->json('data.matches.partial.0.offers_all'));
    }

    public function test_order_item_price_is_snapshotted_when_the_offering_changes(): void
    {
        $lab = $this->laboratory();
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($lab['user'], $cbc);
        $patient = $this->patient();
        Sanctum::actingAs($patient);
        $orderId = $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($lab['user']);
        $this->putJson("/api/v1/laboratory/offerings/{$cbc->id}", [
            'price' => '250.00',
            'estimated_turnaround_hours' => 2,
            'is_available' => true,
        ])->assertOk();

        Sanctum::actingAs($patient);
        $this->getJson("/api/v1/patient/laboratory-orders/{$orderId}")
            ->assertOk()
            ->assertJsonPath('data.items.0.price', '150.00')
            ->assertJsonPath('data.total', '150.00');
        $this->assertSame('250.00', LaboratoryOffering::query()->where('laboratory_profile_id', $lab['profile']->id)->where('lab_test_id', $cbc->id)->value('price'));
    }

    public function test_catalog_addition_request_does_not_create_a_global_test(): void
    {
        Sanctum::actingAs($this->laboratory()['user']);
        $count = LabTest::query()->count();

        $this->postJson('/api/v1/laboratory/catalog-requests', [
            'suggested_name' => 'Vitamin D',
            'note' => 'Please add 25-OH vitamin D',
        ])->assertCreated()->assertJsonPath('data.status', 'pending');

        $this->assertSame($count, LabTest::query()->count());
        $this->assertDatabaseHas('laboratory_catalog_requests', [
            'suggested_name' => 'Vitamin D',
            'status' => 'pending',
        ]);
    }

    /** @return array{user: User, profile: LaboratoryProfile} */
    private function laboratory(string $email = 'lab@example.com', string $name = 'Nile Diagnostics'): array
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
            'location_id' => Location::query()->where('code', 'khartoum')->valueOrFail('id'),
            'verification_status' => DoctorVerificationStatus::Verified->value,
        ]);

        return ['user' => $user, 'profile' => $profile];
    }

    private function patient(string $email = 'patient@example.com'): User
    {
        return User::factory()->create([
            'name' => 'Amina Patient',
            'email' => $email,
            'role' => UserRole::Patient,
            'phone' => '09'.sprintf('%08d', abs(crc32($email)) % 100000000),
        ]);
    }

    private function enable(User $labUser, LabTest $test): void
    {
        Sanctum::actingAs($labUser);
        $this->putJson("/api/v1/laboratory/offerings/{$test->id}", [
            'price' => '150.00',
            'estimated_turnaround_hours' => 2,
            'is_available' => true,
        ])->assertOk();
    }

    private function pdfUpload(): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'labpdf');
        file_put_contents($path, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

        return new UploadedFile($path, 'result.pdf', 'application/pdf', null, true);
    }
}
