<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Enums\DoctorVerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\LabTest;
use App\Models\LaboratoryOffering;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LaboratoryDiscoveryController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));

        $tests = LabTest::query()
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';
                $query->where(function ($inner) use ($like) {
                    $inner->where('name_en', 'like', $like)
                        ->orWhere('name_ar', 'like', $like)
                        ->orWhere('short_name', 'like', $like);
                });
            })
            ->orderBy('name_en')
            ->limit(40)
            ->get(['id', 'name_en', 'name_ar', 'short_name', 'lab_test_category_id']);

        $offerings = LaboratoryOffering::query()
            ->with([
                'laboratoryProfile:id,name,address,location_id,verification_status',
                'laboratoryProfile.location:id,code,name_en,name_ar',
                'labTest:id,name_en,name_ar,short_name',
            ])
            ->where('is_available', true)
            ->whereHas('laboratoryProfile', fn ($profile) => $profile->where('verification_status', DoctorVerificationStatus::Verified->value))
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';
                $query->whereHas('labTest', function ($test) use ($like) {
                    $test->where('name_en', 'like', $like)
                        ->orWhere('name_ar', 'like', $like)
                        ->orWhere('short_name', 'like', $like);
                });
            })
            ->orderBy('price')
            ->limit(80)
            ->get();

        return response()->json([
            'data' => [
                'tests' => $tests,
                'offerings' => $offerings->map(fn (LaboratoryOffering $offering) => [
                    'id' => $offering->id,
                    'laboratory_profile_id' => $offering->laboratory_profile_id,
                    'laboratory_name' => $offering->laboratoryProfile?->name,
                    'address' => $offering->laboratoryProfile?->address,
                    'location' => $offering->laboratoryProfile?->location?->only(['code', 'name_en', 'name_ar']),
                    'lab_test_id' => $offering->lab_test_id,
                    'name_en' => $offering->labTest?->name_en,
                    'name_ar' => $offering->labTest?->name_ar,
                    'short_name' => $offering->labTest?->short_name,
                    'price' => $offering->price,
                    'currency' => $offering->currency,
                    'estimated_turnaround_hours' => $offering->estimated_turnaround_hours,
                ])->values(),
            ],
        ]);
    }
}
