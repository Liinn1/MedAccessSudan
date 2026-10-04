<?php

namespace App\Http\Controllers\Api\V1\Laboratory;

use App\Http\Controllers\Controller;
use App\Models\LabTest;
use App\Models\LabTestCategory;
use App\Support\LabTestQuery;
use App\Support\LaboratoryAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $profile = LaboratoryAccess::profile($request->user());
        $search = trim((string) $request->query('q', ''));
        $categoryId = $request->integer('category_id') ?: null;

        $categories = LabTestCategory::query()
            ->whereHas('tests', fn ($query) => $query->where('is_active', true))
            ->orderBy('sort_order')
            ->get(['id', 'slug', 'name_en', 'name_ar']);
        $offerings = $profile->offerings()->get()->keyBy('lab_test_id');

        $tests = LabTest::query()
            ->where('is_active', true)
            ->when($categoryId, fn ($query) => $query->where('lab_test_category_id', $categoryId))
            ->when($search !== '', fn ($query) => LabTestQuery::matchesSearch($query, $search))
            ->orderBy('name_en')
            ->get();

        $grouped = $categories->map(function (LabTestCategory $category) use ($tests, $offerings) {
            $categoryTests = $tests->where('lab_test_category_id', $category->id)->values();

            return [
                'id' => $category->id,
                'slug' => $category->slug,
                'name_en' => $category->name_en,
                'name_ar' => $category->name_ar,
                'tests' => $categoryTests->map(function (LabTest $test) use ($offerings) {
                    $offering = $offerings->get($test->id);

                    return [
                        'id' => $test->id,
                        'name_en' => $test->name_en,
                        'name_ar' => $test->name_ar,
                        'short_name' => $test->short_name,
                        'specimen_type' => $test->specimen_type,
                        'offering' => $offering ? [
                            'id' => $offering->id,
                            'price' => $offering->price,
                            'currency' => $offering->currency,
                            'estimated_turnaround_hours' => $offering->estimated_turnaround_hours,
                            'is_available' => $offering->is_available,
                        ] : null,
                    ];
                })->values()->all(),
            ];
        })->filter(fn (array $category) => $category['tests'] !== [])->values()->all();

        return response()->json([
            'data' => [
                'categories' => $categories,
                'groups' => $grouped,
            ],
        ]);
    }
}
