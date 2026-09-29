<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Enums\DoctorVerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\LabTest;
use App\Models\LabTestCategory;
use App\Models\LaboratoryOffering;
use App\Models\LaboratoryProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class LaboratoryDiscoveryController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));
        $categoryId = $request->integer('category_id') ?: null;
        $locationId = $request->integer('location_id') ?: null;
        $selectedIds = collect($request->query('lab_test_ids', []))
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        $verifiedLabIds = LaboratoryProfile::query()
            ->where('verification_status', DoctorVerificationStatus::Verified->value)
            ->pluck('id');

        $categories = LabTestCategory::query()
            ->orderBy('sort_order')
            ->get(['id', 'slug', 'name_en', 'name_ar']);

        $stats = LaboratoryOffering::query()
            ->selectRaw('lab_test_id, COUNT(DISTINCT laboratory_profile_id) as laboratory_count, MIN(price) as min_price, MIN(currency) as currency')
            ->where('is_available', true)
            ->whereIn('laboratory_profile_id', $verifiedLabIds)
            ->groupBy('lab_test_id')
            ->get()
            ->keyBy('lab_test_id');

        $tests = LabTest::query()
            ->with('category:id,slug,name_en,name_ar')
            ->where('is_active', true)
            ->whereIn('id', $stats->keys())
            ->when($categoryId, fn ($query) => $query->where('lab_test_category_id', $categoryId))
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';
                $query->where(function ($inner) use ($like) {
                    $inner->where('name_en', 'like', $like)
                        ->orWhere('name_ar', 'like', $like)
                        ->orWhere('short_name', 'like', $like)
                        ->orWhere('slug', 'like', $like);
                });
            })
            ->orderBy('name_en')
            ->get();

        $locations = LaboratoryProfile::query()
            ->with('location:id,code,name_en,name_ar')
            ->whereIn('id', $verifiedLabIds)
            ->whereHas('offerings', fn ($query) => $query->where('is_available', true))
            ->get()
            ->pluck('location')
            ->filter()
            ->unique('id')
            ->values()
            ->map(fn ($location) => $location->only(['id', 'code', 'name_en', 'name_ar']));

        return response()->json([
            'data' => [
                'categories' => $categories,
                'locations' => $locations,
                'tests' => $tests->map(function (LabTest $test) use ($stats) {
                    $stat = $stats->get($test->id);

                    return [
                        'id' => $test->id,
                        'name_en' => $test->name_en,
                        'name_ar' => $test->name_ar,
                        'short_name' => $test->short_name,
                        'category' => $test->category?->only(['id', 'slug', 'name_en', 'name_ar']),
                        'laboratory_count' => (int) ($stat->laboratory_count ?? 0),
                        'min_price' => $stat ? number_format((float) $stat->min_price, 2, '.', '') : null,
                        'currency' => $stat?->currency ?? 'SDG',
                    ];
                })->values(),
                'matches' => $this->matches($selectedIds, $verifiedLabIds, $locationId),
            ],
        ]);
    }

    /**
     * @param  Collection<int, int>  $selectedIds
     * @param  Collection<int, int>  $verifiedLabIds
     * @return array{complete: list<array<string, mixed>>, partial: list<array<string, mixed>>}
     */
    private function matches(Collection $selectedIds, Collection $verifiedLabIds, ?int $locationId): array
    {
        if ($selectedIds->isEmpty()) {
            return ['complete' => [], 'partial' => []];
        }

        $offerings = LaboratoryOffering::query()
            ->with([
                'laboratoryProfile:id,name,address,location_id,verification_status',
                'laboratoryProfile.location:id,code,name_en,name_ar',
                'labTest:id,name_en,name_ar,short_name',
            ])
            ->where('is_available', true)
            ->whereIn('laboratory_profile_id', $verifiedLabIds)
            ->whereIn('lab_test_id', $selectedIds)
            ->when($locationId, function ($query) use ($locationId) {
                $query->whereHas('laboratoryProfile', fn ($profile) => $profile->where('location_id', $locationId));
            })
            ->orderBy('price')
            ->get()
            ->groupBy('laboratory_profile_id');

        $complete = [];
        $partial = [];
        $selectedCount = $selectedIds->count();

        foreach ($offerings as $labOfferings) {
            /** @var LaboratoryOffering $first */
            $first = $labOfferings->first();
            $profile = $first->laboratoryProfile;
            $byTest = $labOfferings->unique('lab_test_id')->keyBy('lab_test_id');
            $matchedIds = $byTest->keys()->map(fn ($id) => (int) $id)->values();
            $items = $selectedIds->map(function (int $testId) use ($byTest) {
                $offering = $byTest->get($testId);
                if (! $offering) {
                    return null;
                }

                return [
                    'lab_test_id' => $offering->lab_test_id,
                    'name_en' => $offering->labTest?->name_en,
                    'name_ar' => $offering->labTest?->name_ar,
                    'short_name' => $offering->labTest?->short_name,
                    'price' => $offering->price,
                    'currency' => $offering->currency,
                    'estimated_turnaround_hours' => $offering->estimated_turnaround_hours,
                ];
            })->filter()->values();

            $payload = [
                'laboratory_profile_id' => $profile?->id,
                'laboratory_name' => $profile?->name,
                'address' => $profile?->address,
                'location' => $profile?->location?->only(['id', 'code', 'name_en', 'name_ar']),
                'offers_all' => $matchedIds->count() === $selectedCount,
                'matched_count' => $matchedIds->count(),
                'selected_count' => $selectedCount,
                'missing_test_ids' => $selectedIds->diff($matchedIds)->values(),
                'items' => $items,
                'total' => $items->reduce(fn (string $sum, array $item) => bcadd($sum, (string) $item['price'], 2), '0.00'),
                'currency' => $items->first()['currency'] ?? 'SDG',
            ];

            if ($payload['offers_all']) {
                $complete[] = $payload;
            } else {
                $partial[] = $payload;
            }
        }

        usort($complete, fn (array $a, array $b) => (float) $a['total'] <=> (float) $b['total']);
        usort($partial, fn (array $a, array $b) => $b['matched_count'] <=> $a['matched_count']);

        return ['complete' => $complete, 'partial' => $partial];
    }
}
