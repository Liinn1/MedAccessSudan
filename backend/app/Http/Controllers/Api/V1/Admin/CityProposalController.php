<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\CityProposalStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ResolveCityProposalRequest;
use App\Models\CityProposal;
use App\Models\Location;
use App\Services\CityNameNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Services\AdminAuditService;

class CityProposalController extends Controller
{
    public function __construct(private readonly AdminAuditService $audit) {}
    public function index(Request $request): JsonResponse
    {
        $status = $request->validate(['status' => ['nullable', 'in:pending,approved,mapped,rejected']])['status'] ?? 'pending';
        $locations = Location::query()->where('is_active', true)->orderBy('name_en')->get(['id', 'code', 'name_en', 'name_ar', 'normalized_name']);
        $proposals = CityProposal::query()
            ->with(['doctorProfile.user:id,name,email', 'resolvedLocation:id,code,name_en,name_ar', 'reviewer:id,name'])
            ->where('status', $status)
            ->latest()
            ->get()
            ->map(fn (CityProposal $proposal): array => [
                'id' => $proposal->id,
                'proposed_name' => $proposal->proposed_name,
                'status' => $proposal->status->value,
                'doctor' => $proposal->doctorProfile->user->only(['id', 'name', 'email']),
                'likely_matches' => $locations->filter(function (Location $location) use ($proposal): bool {
                    similar_text($proposal->normalized_name, $location->normalized_name, $percentage);

                    return str_contains($location->normalized_name, $proposal->normalized_name)
                        || str_contains($proposal->normalized_name, $location->normalized_name)
                        || $percentage >= 60;
                })->take(5)->values()->map->only(['id', 'code', 'name_en', 'name_ar']),
                'resolved_location' => $proposal->resolvedLocation?->only(['id', 'code', 'name_en', 'name_ar']),
                'reviewed_by' => $proposal->reviewer?->only(['id', 'name']),
                'reviewed_at' => $proposal->reviewed_at?->toIso8601String(),
            ]);

        return response()->json(['data' => ['proposals' => $proposals, 'locations' => $locations->map->only(['id', 'code', 'name_en', 'name_ar'])]]);
    }

    public function update(ResolveCityProposalRequest $request, CityProposal $proposal, CityNameNormalizer $cityNames): JsonResponse
    {
        $data = $request->validated();
        $proposal = DB::transaction(function () use ($request, $proposal, $cityNames, $data): CityProposal {
            $proposal = CityProposal::query()->lockForUpdate()->findOrFail($proposal->id);

            if ($proposal->status !== CityProposalStatus::Pending) {
                throw ValidationException::withMessages(['action' => 'This city proposal has already been reviewed.']);
            }

            $location = null;
            $status = CityProposalStatus::Rejected;

            if ($data['action'] === 'map') {
                $location = Location::query()->where('is_active', true)->findOrFail($data['location_id']);
                $status = CityProposalStatus::Mapped;
            } elseif ($data['action'] === 'approve') {
                $name = $cityNames->display($data['name_en']);
                $normalized = $cityNames->comparison($name);

                if (Location::query()->where('normalized_name', $normalized)->exists()) {
                    throw ValidationException::withMessages(['name_en' => 'An approved city with this normalized name already exists. Map the proposal instead.']);
                }

                $location = Location::create([
                    'code' => $cityNames->uniqueCode($name),
                    'name_en' => $name,
                    'name_ar' => isset($data['name_ar']) ? $cityNames->display($data['name_ar']) : $name,
                    'normalized_name' => $normalized,
                    'is_active' => true,
                ]);
                $status = CityProposalStatus::Approved;
            }

            if ($location) {
                $proposal->doctorProfile()->update(['location_id' => $location->id]);
            }

            $proposal->update([
                'status' => $status,
                'resolved_location_id' => $location?->id,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            return $proposal;
        });

        $this->audit->record($request->user(), 'city_proposal.'.$data['action'], $proposal, ['resolved_location_id' => $proposal->resolved_location_id]);

        return response()->json(['data' => ['proposal' => $proposal->fresh(['resolvedLocation', 'reviewer'])], 'message' => 'City proposal reviewed successfully.']);
    }
}
