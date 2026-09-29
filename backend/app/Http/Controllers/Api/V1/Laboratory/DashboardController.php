<?php

namespace App\Http\Controllers\Api\V1\Laboratory;

use App\Enums\LaboratoryOrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuthenticatedUserResource;
use App\Http\Resources\LaboratoryOrderResource;
use App\Models\LaboratoryOffering;
use App\Models\LaboratoryOrderItem;
use App\Services\ProfilePhotoService;
use App\Support\LaboratoryAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $profile = LaboratoryAccess::profile($request->user());
        $profile->load('location:id,code,name_en,name_ar');
        $orders = $profile->orders();

        $recent = (clone $orders)->with(['patient:id,name,phone', 'items', 'results'])->latest('id')->limit(8)->get();
        $awaiting = (clone $orders)->with(['patient:id,name,phone', 'items', 'results'])
            ->whereIn('status', [
                LaboratoryOrderStatus::SampleCollected->value,
                LaboratoryOrderStatus::InProgress->value,
            ])
            ->latest('id')
            ->limit(8)
            ->get();

        $offerings = $profile->offerings()->with(['labTest:id,lab_test_category_id,name_en,name_ar', 'labTest.category:id,name_en,name_ar'])->get();
        $availableOfferings = $offerings->where('is_available', true);

        return response()->json([
            'data' => [
                'user' => new AuthenticatedUserResource($request->user()),
                'profile' => [
                    'id' => $profile->id,
                    'name' => $profile->name,
                    'address' => $profile->address,
                    'verification_status' => $profile->verification_status,
                    'profile_image_url' => ProfilePhotoService::publicUrl($profile->profile_image_path ?? $request->user()->profile_image_path),
                    'location' => $profile->location?->only(['code', 'name_en', 'name_ar']),
                    'phone' => $request->user()->phone,
                ],
                'summary' => [
                    'pending_requests' => (clone $orders)->where('status', LaboratoryOrderStatus::Requested->value)->count(),
                    'in_progress' => (clone $orders)->whereIn('status', [
                        LaboratoryOrderStatus::SampleCollected->value,
                        LaboratoryOrderStatus::InProgress->value,
                    ])->count(),
                    'results_ready' => (clone $orders)->where('status', LaboratoryOrderStatus::ResultReady->value)->count(),
                    'tests_offered' => $availableOfferings->count(),
                    'tests_unavailable' => $offerings->where('is_available', false)->count(),
                ],
                'recent_requests' => LaboratoryOrderResource::collection($recent)->resolve(),
                'awaiting_results' => LaboratoryOrderResource::collection($awaiting)->resolve(),
                'request_activity' => $this->requestActivity($profile->id),
                'catalog_categories' => $this->catalogCategories($availableOfferings),
                'most_requested' => $this->mostRequested($profile->id),
            ],
        ]);
    }

    /**
     * Seven calendar days in Africa/Khartoum. Counts come from requested_at, never placeholders.
     *
     * @return list<array{date: string, count: int}>
     */
    private function requestActivity(int $laboratoryProfileId): array
    {
        $timezone = (string) config('app.timezone');
        $start = CarbonImmutable::now($timezone)->startOfDay()->subDays(6);
        $rows = DB::table('laboratory_orders')
            ->where('laboratory_profile_id', $laboratoryProfileId)
            ->where('requested_at', '>=', $start)
            ->get(['requested_at']);

        $byDay = [];
        foreach ($rows as $row) {
            $day = CarbonImmutable::parse($row->requested_at)->timezone($timezone)->toDateString();
            $byDay[$day] = ($byDay[$day] ?? 0) + 1;
        }

        $series = [];
        for ($offset = 0; $offset < 7; $offset++) {
            $date = $start->addDays($offset)->toDateString();
            $series[] = ['date' => $date, 'count' => $byDay[$date] ?? 0];
        }

        return $series;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, LaboratoryOffering>  $availableOfferings
     * @return list<array{name_en: string, name_ar: string, count: int}>
     */
    private function catalogCategories($availableOfferings): array
    {
        return $availableOfferings
            ->groupBy(fn (LaboratoryOffering $offering) => $offering->labTest?->lab_test_category_id)
            ->map(function ($group) {
                $category = $group->first()?->labTest?->category;

                return [
                    'name_en' => $category?->name_en ?? 'Other',
                    'name_ar' => $category?->name_ar ?? 'أخرى',
                    'count' => $group->count(),
                ];
            })
            ->sortByDesc('count')
            ->values()
            ->take(6)
            ->all();
    }

    /**
     * @return list<array{name_en: string, name_ar: string, short_name: ?string, count: int}>
     */
    private function mostRequested(int $laboratoryProfileId): array
    {
        return LaboratoryOrderItem::query()
            ->select('name_en', 'name_ar', 'short_name', DB::raw('COUNT(*) as request_count'))
            ->whereHas('order', fn ($query) => $query->where('laboratory_profile_id', $laboratoryProfileId))
            ->groupBy('name_en', 'name_ar', 'short_name')
            ->orderByDesc('request_count')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'name_en' => $row->name_en,
                'name_ar' => $row->name_ar,
                'short_name' => $row->short_name,
                'count' => (int) $row->request_count,
            ])
            ->all();
    }
}
