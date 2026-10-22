<?php

namespace Tests\Feature\Api\V1\Patient;

use App\Enums\UserRole;
use App\Models\DoctorProfile;
use App\Models\LaboratoryOffering;
use App\Models\LaboratoryProfile;
use App\Models\LabTest;
use App\Models\LabTestCategory;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PatientGlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_searches_patient_visible_healthcare_entities_in_english_and_arabic(): void
    {
        [$doctor, $laboratory, $test] = $this->searchableRecords();
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Patient]));

        $this->getJson('/api/v1/patient/search?q=Ahmed')->assertOk()->assertJsonPath('data.doctors.0.id', $doctor->id);
        $this->getJson('/api/v1/patient/search?q=Cardio')->assertOk()->assertJsonPath('data.specializations.0.code', 'cardiology-search');
        $this->getJson('/api/v1/patient/search?q='.urlencode('القلب'))->assertOk()->assertJsonPath('data.specializations.0.code', 'cardiology-search');
        $this->getJson('/api/v1/patient/search?q=Nile')->assertOk()->assertJsonPath('data.laboratories.0.id', $laboratory->id);
        $this->getJson('/api/v1/patient/search?q=CBC')->assertOk()->assertJsonPath('data.tests.0.id', $test->id);
    }

    public function test_it_excludes_ineligible_providers_and_never_searches_patients(): void
    {
        $this->searchableRecords();
        $privatePatient = User::factory()->create(['role' => UserRole::Patient, 'name' => 'Private Search Person']);
        $hiddenDoctorUser = User::factory()->create(['role' => UserRole::Doctor, 'name' => 'Hidden Search Doctor']);
        $location = Location::query()->where('code', 'global-search-city')->firstOrFail();
        $specialty = Specialization::query()->where('code', 'cardiology-search')->firstOrFail();
        DoctorProfile::query()->create(['user_id' => $hiddenDoctorUser->id, 'location_id' => $location->id, 'specialization_id' => $specialty->id, 'verification_status' => 'pending', 'offers_clinic_visits' => true]);
        Sanctum::actingAs($privatePatient);

        $this->getJson('/api/v1/patient/search?q=Hidden')->assertOk()->assertJsonCount(0, 'data.doctors');
        $response = $this->getJson('/api/v1/patient/search?q=Private')->assertOk();
        $response->assertJsonCount(0, 'data.doctors')->assertJsonCount(0, 'data.laboratories')->assertJsonCount(0, 'data.tests');
        $this->getJson('/api/v1/patient/search?q=')->assertUnprocessable();
    }

    private function searchableRecords(): array
    {
        $location = Location::query()->firstOrCreate(['code' => 'global-search-city'], ['name_en' => 'Khartoum Search', 'name_ar' => 'مدينة البحث', 'normalized_name' => 'khartoum search', 'normalized_name_ar' => 'مدينة البحث', 'is_active' => true]);
        $specialty = Specialization::query()->firstOrCreate(['code' => 'cardiology-search'], ['name_en' => 'Cardiology Search', 'name_ar' => 'طب القلب', 'is_active' => true]);
        $doctor = DoctorProfile::query()->create(['user_id' => User::factory()->create(['role' => UserRole::Doctor, 'name' => 'Dr Ahmed Search'])->id, 'location_id' => $location->id, 'specialization_id' => $specialty->id, 'verification_status' => 'verified', 'offers_clinic_visits' => true]);
        $laboratory = LaboratoryProfile::query()->create(['user_id' => User::factory()->create(['role' => UserRole::Laboratory])->id, 'location_id' => $location->id, 'name' => 'Nile Search Laboratory', 'address' => 'Khartoum', 'verification_status' => 'verified', 'supports_at_lab' => true]);
        $category = LabTestCategory::query()->create(['slug' => 'blood-search', 'name_en' => 'Blood Search', 'name_ar' => 'فحوصات الدم', 'sort_order' => 1]);
        $test = LabTest::query()->create(['lab_test_category_id' => $category->id, 'slug' => 'cbc-search', 'name_en' => 'Complete Blood Count', 'name_ar' => 'تعداد الدم الكامل', 'short_name' => 'CBC', 'is_active' => true]);
        LaboratoryOffering::query()->create(['laboratory_profile_id' => $laboratory->id, 'lab_test_id' => $test->id, 'price' => 100, 'currency' => 'SDG', 'estimated_turnaround_hours' => 12, 'is_available' => true]);

        return [$doctor, $laboratory, $test];
    }
}
