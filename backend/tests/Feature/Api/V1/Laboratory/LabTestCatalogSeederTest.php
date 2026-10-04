<?php

namespace Tests\Feature\Api\V1\Laboratory;

use App\Models\LabTest;
use App\Models\LabTestCategory;
use Database\Seeders\LabTestCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LabTestCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_a_broad_catalogue_without_duplicates(): void
    {
        $this->seed(LabTestCatalogSeeder::class);
        $firstCount = LabTest::query()->count();
        $firstCategories = LabTestCategory::query()->count();
        $cbcId = LabTest::query()->where('slug', 'cbc')->value('id');

        $this->assertGreaterThanOrEqual(20, LabTestCategory::query()->whereHas('tests')->count());
        $this->assertGreaterThanOrEqual(120, $firstCount);
        $this->assertTrue(LabTest::query()->where('slug', 'cbc')->where('short_name', 'CBC')->exists());
        $this->assertTrue(LabTest::query()->where('slug', 'tsh')->exists());
        $this->assertTrue(LabTest::query()->where('slug', 'ferritin')->exists());
        $this->assertTrue(LabTest::query()->where('slug', 'urinalysis')->exists());
        $this->assertTrue(LabTest::query()->where('slug', 'stool-culture')->exists());
        $this->assertTrue(LabTest::query()->where('slug', 'vitamin-d')->exists());
        $this->assertSame(1, LabTest::query()->where('slug', 'cbc')->count());

        $this->seed(LabTestCatalogSeeder::class);

        $this->assertSame($firstCount, LabTest::query()->count());
        $this->assertSame($firstCategories, LabTestCategory::query()->count());
        $this->assertSame($cbcId, LabTest::query()->where('slug', 'cbc')->value('id'));
    }
}
