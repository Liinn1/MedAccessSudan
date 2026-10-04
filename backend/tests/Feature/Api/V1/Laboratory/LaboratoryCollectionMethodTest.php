<?php

namespace Tests\Feature\Api\V1\Laboratory;

use App\Enums\DoctorVerificationStatus;
use App\Enums\LaboratoryCollectionMethod;
use App\Enums\UserRole;
use App\Models\LabTest;
use App\Models\LaboratoryOrder;
use App\Models\LaboratoryProfile;
use App\Models\Location;
use App\Models\User;
use Database\Seeders\LabTestCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LaboratoryCollectionMethodTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LabTestCatalogSeeder::class);
    }

    public function test_at_lab_order_stores_collection_method_without_home_address(): void
    {
        $lab = $this->laboratory();
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($lab['user'], $cbc);
        Sanctum::actingAs($this->patient());

        $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
        ])->assertCreated()
            ->assertJsonPath('data.collection_method', LaboratoryCollectionMethod::AtLab->value)
            ->assertJsonPath('data.collection', null);

        $this->assertDatabaseHas('laboratory_orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'collection_method' => LaboratoryCollectionMethod::AtLab->value,
            'collection_address' => null,
        ]);
    }

    public function test_home_collection_requires_location_date_and_time(): void
    {
        $lab = $this->laboratory(home: true);
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($lab['user'], $cbc);
        Sanctum::actingAs($this->patient());

        $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
            'collection_method' => LaboratoryCollectionMethod::HomeCollection->value,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['collection_location_id', 'collection_area', 'collection_address', 'collection_starts_at', 'collection_latitude', 'collection_longitude']);
    }

    public function test_home_collection_order_stores_collection_details(): void
    {
        $lab = $this->laboratory(home: true);
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($lab['user'], $cbc);
        $locationId = Location::query()->where('code', 'khartoum')->valueOrFail('id');
        Sanctum::actingAs($this->patient());
        $startsAt = now()->addDay()->setTime(10, 30);

        $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
            'collection_method' => LaboratoryCollectionMethod::HomeCollection->value,
            'collection_location_id' => $locationId,
            'collection_area' => 'Al Riyadh',
            'collection_address' => 'Building 12, apartment 4',
            'collection_notes' => 'Call on arrival',
            'collection_starts_at' => $startsAt->toIso8601String(),
            'collection_latitude' => 15.5000000,
            'collection_longitude' => 32.5000000,
        ])->assertCreated()
            ->assertJsonPath('data.collection_method', LaboratoryCollectionMethod::HomeCollection->value)
            ->assertJsonPath('data.collection.area', 'Al Riyadh')
            ->assertJsonPath('data.collection.address', 'Building 12, apartment 4')
            ->assertJsonPath('data.collection.notes', 'Call on arrival')
            ->assertJsonPath('data.collection.latitude', 15.5)
            ->assertJsonPath('data.collection.longitude', 32.5);

        $order = LaboratoryOrder::query()->firstOrFail();
        $this->assertSame(LaboratoryCollectionMethod::HomeCollection, $order->collection_method);
        $this->assertSame('Al Riyadh', $order->collection_area);
        $this->assertSame((int) $locationId, (int) $order->collection_location_id);
        $this->assertEqualsWithDelta(15.5, (float) $order->collection_latitude, 0.0001);
        $this->assertEqualsWithDelta(32.5, (float) $order->collection_longitude, 0.0001);
    }

    public function test_home_collection_is_rejected_when_laboratory_does_not_support_it(): void
    {
        $lab = $this->laboratory(home: false);
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($lab['user'], $cbc);
        Sanctum::actingAs($this->patient());

        $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
            'collection_method' => LaboratoryCollectionMethod::HomeCollection->value,
            'collection_location_id' => Location::query()->where('code', 'khartoum')->valueOrFail('id'),
            'collection_area' => 'Al Riyadh',
            'collection_address' => 'Building 12',
            'collection_starts_at' => now()->addDay()->toIso8601String(),
            'collection_latitude' => 15.5,
            'collection_longitude' => 32.5,
        ])->assertUnprocessable()
            ->assertJsonPath('code', 'LABORATORY_HOME_COLLECTION_UNAVAILABLE');
    }

    public function test_home_collection_discovery_excludes_laboratories_without_the_capability(): void
    {
        $homeLab = $this->laboratory('home.lab@example.com', 'Home Lab', true);
        $visitLab = $this->laboratory('visit.lab@example.com', 'Visit Lab', false);
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($homeLab['user'], $cbc);
        $this->enable($visitLab['user'], $cbc);
        Sanctum::actingAs($this->patient());

        $home = $this->getJson('/api/v1/patient/laboratory-offerings?'.http_build_query([
            'lab_test_ids' => [$cbc->id],
            'collection_method' => LaboratoryCollectionMethod::HomeCollection->value,
        ]))->assertOk();

        $homeIds = collect($home->json('data.matches.complete'))->pluck('laboratory_profile_id');
        $this->assertTrue($homeIds->contains($homeLab['profile']->id));
        $this->assertFalse($homeIds->contains($visitLab['profile']->id));

        $visit = $this->getJson('/api/v1/patient/laboratory-offerings?'.http_build_query([
            'lab_test_ids' => [$cbc->id],
        ]))->assertOk();

        $visitIds = collect($visit->json('data.matches.complete'))->pluck('laboratory_profile_id');
        $this->assertTrue($visitIds->contains($homeLab['profile']->id));
        $this->assertTrue($visitIds->contains($visitLab['profile']->id));
    }

    public function test_laboratory_can_filter_requests_by_collection_method(): void
    {
        $lab = $this->laboratory('filter.lab@example.com', 'Filter Lab', true);
        $cbc = LabTest::query()->where('slug', 'cbc')->firstOrFail();
        $this->enable($lab['user'], $cbc);
        $patient = $this->patient('filter.patient@example.com');
        $locationId = Location::query()->where('code', 'khartoum')->valueOrFail('id');
        Sanctum::actingAs($patient);
        $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
            'collection_method' => LaboratoryCollectionMethod::AtLab->value,
        ])->assertCreated();
        $this->postJson('/api/v1/patient/laboratory-orders', [
            'laboratory_profile_id' => $lab['profile']->id,
            'lab_test_ids' => [$cbc->id],
            'payment_method' => 'pay_later',
            'collection_method' => LaboratoryCollectionMethod::HomeCollection->value,
            'collection_location_id' => $locationId,
            'collection_area' => 'Al Riyadh',
            'collection_address' => 'Building 12',
            'collection_starts_at' => now()->addDay()->toIso8601String(),
            'collection_latitude' => 15.5,
            'collection_longitude' => 32.5,
        ])->assertCreated();

        Sanctum::actingAs($lab['user']);
        $this->assertCount(2, $this->getJson('/api/v1/laboratory/orders')->assertOk()->json('data'));
        $this->assertCount(1, $this->getJson('/api/v1/laboratory/orders?collection_method=at_lab')->assertOk()->json('data'));
        $home = $this->getJson('/api/v1/laboratory/orders?collection_method=home_collection')->assertOk();
        $this->assertCount(1, $home->json('data'));
        $this->assertSame('Al Riyadh', $home->json('data.0.collection.area'));
    }

    public function test_laboratory_can_enable_home_collection_on_profile(): void
    {
        $lab = $this->laboratory();
        Sanctum::actingAs($lab['user']);

        $this->putJson('/api/v1/laboratory/profile', [
            'name' => $lab['profile']->name,
            'phone' => $lab['user']->phone,
            'address' => $lab['profile']->address,
            'location' => 'khartoum',
            'supports_home_collection' => true,
        ])->assertOk()
            ->assertJsonPath('data.profile.supports_home_collection', true);

        $this->assertTrue($lab['profile']->fresh()->supports_home_collection);
    }

    /** @return array{user: User, profile: LaboratoryProfile} */
    private function laboratory(string $email = 'lab@example.com', string $name = 'Nile Diagnostics', bool $home = false): array
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
            'supports_home_collection' => $home,
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
}
