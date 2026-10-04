<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\LaboratoryCatalogRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\LabTest;
use App\Models\LabTestCategory;
use App\Models\LaboratoryCatalogRequest;
use App\Services\AdminAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CatalogRequestReviewController extends Controller
{
    public function __construct(private readonly AdminAuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::enum(LaboratoryCatalogRequestStatus::class)],
        ]);

        $requests = LaboratoryCatalogRequest::query()
            ->with([
                'laboratoryProfile:id,name,user_id',
                'laboratoryProfile.user:id,name,email',
                'suggestedCategory:id,slug,name_en,name_ar',
                'resolvedTest:id,name_en,name_ar,short_name,slug',
            ])
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (LaboratoryCatalogRequest $record) => $this->payload($record));

        return response()->json([
            'data' => [
                'requests' => $requests,
                'categories' => LabTestCategory::query()->orderBy('sort_order')->get(['id', 'slug', 'name_en', 'name_ar']),
            ],
        ]);
    }

    public function update(Request $request, LaboratoryCatalogRequest $catalogRequest): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:approve,map,reject'],
            'name_en' => ['required_if:action,approve', 'nullable', 'string', 'max:160'],
            'name_ar' => ['nullable', 'string', 'max:160'],
            'short_name' => ['nullable', 'string', 'max:40'],
            'lab_test_category_id' => ['required_if:action,approve', 'nullable', 'integer', 'exists:lab_test_categories,id'],
            'lab_test_id' => ['required_if:action,map', 'nullable', 'integer', 'exists:lab_tests,id'],
            'admin_note' => ['required_if:action,reject', 'nullable', 'string', 'max:2000'],
        ]);

        if ($catalogRequest->status !== LaboratoryCatalogRequestStatus::Pending) {
            throw ValidationException::withMessages(['action' => 'This catalogue request has already been reviewed.']);
        }

        if ($data['action'] === 'reject') {
            $catalogRequest->update([
                'status' => LaboratoryCatalogRequestStatus::Rejected,
                'admin_note' => $data['admin_note'],
                'reviewed_by_user_id' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
            $this->audit->record($request->user(), 'catalog_request.rejected', $catalogRequest);
        } elseif ($data['action'] === 'map') {
            $test = LabTest::query()->findOrFail($data['lab_test_id']);
            $catalogRequest->update([
                'status' => LaboratoryCatalogRequestStatus::Approved,
                'resolved_lab_test_id' => $test->id,
                'reviewed_by_user_id' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
            $this->audit->record($request->user(), 'catalog_request.mapped', $catalogRequest, ['lab_test_id' => $test->id]);
        } else {
            $nameEn = trim((string) $data['name_en']);
            $duplicate = $this->findEquivalent($nameEn, $data['short_name'] ?? null);
            if ($duplicate) {
                throw ValidationException::withMessages([
                    'name_en' => 'An equivalent catalogue test already exists. Map this request to that test instead.',
                    'existing_lab_test_id' => $duplicate->id,
                ]);
            }
            $test = LabTest::query()->create([
                'lab_test_category_id' => $data['lab_test_category_id'],
                'slug' => $this->uniqueSlug($nameEn),
                'name_en' => $nameEn,
                'name_ar' => trim((string) ($data['name_ar'] ?? $nameEn)),
                'short_name' => isset($data['short_name']) ? trim((string) $data['short_name']) : null,
                'is_active' => true,
            ]);
            $catalogRequest->update([
                'status' => LaboratoryCatalogRequestStatus::Approved,
                'resolved_lab_test_id' => $test->id,
                'reviewed_by_user_id' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
            $this->audit->record($request->user(), 'catalog_request.approved', $catalogRequest, ['lab_test_id' => $test->id]);
        }

        return response()->json([
            'data' => $this->payload($catalogRequest->fresh([
                'laboratoryProfile.user:id,name,email',
                'suggestedCategory:id,slug,name_en,name_ar',
                'resolvedTest:id,name_en,name_ar,short_name,slug',
            ])),
            'matches' => $data['action'] === 'approve' ? [] : LabTest::query()->limit(0)->get(),
        ]);
    }

    public function matches(Request $request): JsonResponse
    {
        $name = trim((string) $request->query('q', ''));

        return response()->json([
            'data' => ['tests' => $name === '' ? [] : LabTest::query()
                ->where(function ($query) use ($name) {
                    $like = '%'.$name.'%';
                    $query->where('name_en', 'like', $like)
                        ->orWhere('name_ar', 'like', $like)
                        ->orWhere('short_name', 'like', $like)
                        ->orWhere('search_aliases', 'like', $like)
                        ->orWhere('slug', 'like', '%'.Str::slug($name).'%');
                })
                ->orderBy('name_en')
                ->limit(8)
                ->get(['id', 'name_en', 'name_ar', 'short_name', 'slug'])],
        ]);
    }

    private function payload(LaboratoryCatalogRequest $record): array
    {
        return [
            'id' => $record->id,
            'suggested_name' => $record->suggested_name,
            'note' => $record->note,
            'status' => $record->status->value,
            'created_at' => $record->created_at?->toIso8601String(),
            'reviewed_at' => $record->reviewed_at?->toIso8601String(),
            'admin_note' => $record->admin_note,
            'laboratory' => [
                'id' => $record->laboratoryProfile?->id,
                'name' => $record->laboratoryProfile?->name,
                'email' => $record->laboratoryProfile?->user?->email,
            ],
            'suggested_category' => $record->suggestedCategory?->only(['id', 'slug', 'name_en', 'name_ar']),
            'resolved_test' => $record->resolvedTest?->only(['id', 'name_en', 'name_ar', 'short_name', 'slug']),
        ];
    }

    private function findEquivalent(string $nameEn, ?string $shortName): ?LabTest
    {
        $needle = $this->normalize($nameEn);
        $short = $shortName ? $this->normalize($shortName) : null;

        return LabTest::query()->get(['id', 'name_en', 'name_ar', 'short_name', 'slug', 'search_aliases'])->first(function (LabTest $test) use ($needle, $short) {
            $candidates = [$test->name_en, $test->name_ar, $test->short_name, $test->slug, ...($test->search_aliases ?? [])];

            return collect($candidates)->filter()->contains(fn ($value) => $this->normalize((string) $value) === $needle)
                || ($short && collect($candidates)->filter()->contains(fn ($value) => $this->normalize((string) $value) === $short));
        });
    }

    private function normalize(string $value): string
    {
        return trim(preg_replace('/[^a-z0-9]+/i', ' ', Str::lower($value)) ?? '');
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'lab-test';
        $slug = $base;
        $suffix = 2;
        while (LabTest::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
