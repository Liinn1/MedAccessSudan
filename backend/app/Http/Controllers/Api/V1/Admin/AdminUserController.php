<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\DoctorVerificationStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfilePhotoRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\DoctorProfile;
use App\Models\LaboratoryProfile;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\User;
use App\Services\AdminAuditService;
use App\Services\CityNameNormalizer;
use App\Services\ProfilePhotoService;
use App\Services\ProviderVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AdminUserController extends Controller
{
    public function __construct(
        private readonly AdminAuditService $audit,
        private readonly ProviderVerificationService $verifications,
        private readonly CityNameNormalizer $cityNames,
        private readonly ProfilePhotoService $photos,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'role' => ['nullable', 'string', Rule::in(['patient', 'doctor', 'laboratory', 'providers'])],
            'status' => ['nullable', 'in:active,inactive'],
            'verification' => ['nullable', 'in:verified,pending,rejected'],
            'sort' => ['nullable', 'in:newest,oldest,name'],
            'q' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $platformRoles = [UserRole::Patient->value, UserRole::Doctor->value, UserRole::Laboratory->value];

        $query = User::query()
            ->with([
                'doctorProfile:id,user_id,verification_status,profile_image_path',
                'laboratoryProfile:id,user_id,verification_status,name,profile_image_path',
            ])
            ->whereIn('role', $platformRoles)
            ->when($data['role'] ?? null, function ($query, $role) {
                if ($role === 'providers') {
                    $query->whereIn('role', [UserRole::Doctor->value, UserRole::Laboratory->value]);
                    return;
                }
                $query->where('role', $role);
            })
            ->when(isset($data['status']), fn ($query) => $query->where('is_active', $data['status'] === 'active'))
            ->when($data['verification'] ?? null, function ($query, $verification) {
                $statuses = match ($verification) {
                    'verified' => [DoctorVerificationStatus::Verified->value],
                    'rejected' => [DoctorVerificationStatus::ActionRequired->value],
                    default => [DoctorVerificationStatus::PendingDocuments->value, DoctorVerificationStatus::UnderReview->value, 'pending'],
                };
                $query->where(function ($inner) use ($statuses) {
                    $inner->whereHas('doctorProfile', fn ($profile) => $profile->whereIn('verification_status', $statuses))
                        ->orWhereHas('laboratoryProfile', fn ($profile) => $profile->whereIn('verification_status', $statuses));
                });
            })
            ->when($data['q'] ?? null, function ($query, $search) {
                $like = '%'.$search.'%';
                $query->where(fn ($inner) => $inner->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('phone', 'like', $like));
            });

        $sort = $data['sort'] ?? 'newest';
        match ($sort) {
            'oldest' => $query->oldest(),
            'name' => $query->orderBy('name'),
            default => $query->latest(),
        };

        $page = $query->paginate(15)->withQueryString();

        return response()->json([
            'data' => [
                'users' => collect($page->items())->map(fn (User $user) => $this->listPayload($user))->values(),
                'meta' => [
                    'total' => $page->total(),
                    'from' => $page->firstItem(),
                    'to' => $page->lastItem(),
                    'current_page' => $page->currentPage(),
                    'last_page' => $page->lastPage(),
                    'per_page' => $page->perPage(),
                ],
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        if ($user->role->isAdministrative()) {
            abort(404);
        }

        $user->load(['doctorProfile.specialization:id,code,name_en,name_ar', 'doctorProfile.location:id,code,name_en,name_ar', 'laboratoryProfile.location:id,code,name_en,name_ar']);

        return response()->json(['data' => ['user' => $this->detailPayload($user)]]);
    }

    public function store(Request $request): JsonResponse
    {
        $type = $request->validate(['account_type' => ['required', 'in:patient,doctor,laboratory']])['account_type'];

        $user = match ($type) {
            'patient' => $this->createPatient($request),
            'doctor' => $this->createDoctor($request),
            default => $this->createLaboratory($request),
        };

        $this->audit->record($request->user(), 'user.created', $user, ['role' => $user->role->value]);

        return response()->json(['data' => ['user' => $this->listPayload($user->fresh(['doctorProfile', 'laboratoryProfile']))], 'message' => 'Account created.'], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if ($user->role->isAdministrative()) {
            abort(403);
        }

        $data = $request->validate([
            'is_active' => ['sometimes', 'boolean'],
            'name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($user->id)],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);
        $reason = $data['reason'] ?? null;
        unset($data['reason']);

        if ($request->user()->is($user) && array_key_exists('is_active', $data) && $data['is_active'] === false) {
            throw ValidationException::withMessages(['is_active' => 'You cannot deactivate your own account.']);
        }

        $user->update($data);
        if (array_key_exists('is_active', $data) && $data['is_active'] === false) {
            $user->tokens()->delete();
            $user->forceFill(['remember_token' => null])->save();
            if (config('session.driver') === 'database') {
                DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
            }
        }
        $this->audit->record($request->user(), 'user.updated', $user, array_filter([...$data, 'reason' => $reason], fn ($value) => $value !== null && $value !== ''));

        return response()->json(['data' => ['user' => $this->listPayload($user->fresh(['doctorProfile', 'laboratoryProfile']))]]);
    }

    public function profile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($request->user()->id)],
        ]);
        $request->user()->update($data);

        return response()->json(['data' => ['user' => (new AuthenticatedUserResource($request->user()->fresh()))->resolve()]]);
    }

    public function storePhoto(UpdateProfilePhotoRequest $request): JsonResponse
    {
        $user = $request->user();
        $this->photos->replace(
            $request->file('profile_photo'),
            'admins',
            $user->profile_image_path,
            fn (string $path) => $user->update(['profile_image_path' => $path]),
        );

        return response()->json(['data' => ['user' => (new AuthenticatedUserResource($user->fresh()))->resolve()], 'message' => 'Profile picture updated.']);
    }

    public function destroyPhoto(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->photos->remove($user->profile_image_path, fn () => $user->update(['profile_image_path' => null]));

        return response()->json(['data' => ['user' => (new AuthenticatedUserResource($user->fresh()))->resolve()], 'message' => 'Profile picture removed.']);
    }

    private function createPatient(Request $request): User
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'regex:/^\+?[0-9]{7,15}$/', 'max:30', 'unique:users,phone'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);
        $user = User::create([
            'name' => $data['first_name'].' '.$data['last_name'],
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => strtolower($data['email']),
            'phone' => $data['phone'],
            'role' => UserRole::Patient,
            'password' => $data['password'],
        ]);
        $user->sendEmailVerificationNotification();

        return $user;
    }

    private function createDoctor(Request $request): User
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'regex:/^\+?[0-9]{7,15}$/', 'max:30', 'unique:users,phone'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'specialization' => ['required', Rule::exists(Specialization::class, 'code')->where('is_active', true)],
            'location' => ['nullable', 'required_without:proposed_city', Rule::exists(Location::class, 'code')->where('is_active', true)],
            'proposed_city' => ['nullable', 'required_without:location', 'string', 'min:2', 'max:150'],
            'clinic_name' => ['nullable', 'string', 'max:255'],
            'profile_photo' => ['required', ...ProfilePhotoService::VALIDATION_RULES],
        ]);
        $photoPath = $this->photos->store($request->file('profile_photo'), 'doctors');
        $locationId = isset($data['location']) ? Location::where('code', $data['location'])->valueOrFail('id') : null;
        $user = DB::transaction(function () use ($data, $photoPath, $locationId) {
            $user = User::create([
                'name' => $data['first_name'].' '.$data['last_name'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => strtolower($data['email']),
                'phone' => $data['phone'],
                'role' => UserRole::Doctor,
                'password' => $data['password'],
            ]);
            $profile = $user->doctorProfile()->create([
                'specialization_id' => Specialization::where('code', $data['specialization'])->valueOrFail('id'),
                'location_id' => $locationId,
                'clinic_name' => $data['clinic_name'] ?? null,
                'profile_image_path' => $photoPath,
                'verification_status' => DoctorVerificationStatus::PendingDocuments->value,
            ]);
            if (! empty($data['proposed_city'])) {
                $profile->cityProposal()->create([
                    'proposed_name' => $this->cityNames->display($data['proposed_city']),
                    'normalized_name' => $this->cityNames->comparison($data['proposed_city']),
                    'status' => 'pending',
                ]);
            }
            $this->verifications->ensure($profile);

            return $user;
        });
        $user->sendEmailVerificationNotification();

        return $user;
    }

    private function createLaboratory(Request $request): User
    {
        $data = $request->validate([
            'laboratory_name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'regex:/^\+?[0-9]{7,15}$/', 'max:30', 'unique:users,phone'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'location' => ['nullable', 'required_without:proposed_city', Rule::exists(Location::class, 'code')->where('is_active', true)],
            'proposed_city' => ['nullable', 'required_without:location', 'string', 'min:2', 'max:150'],
            'address' => ['required', 'string', 'min:4', 'max:255'],
        ]);
        $locationId = isset($data['location']) ? Location::where('code', $data['location'])->valueOrFail('id') : null;
        $user = DB::transaction(function () use ($data, $locationId) {
            $user = User::create([
                'name' => $data['laboratory_name'],
                'first_name' => $data['laboratory_name'],
                'email' => strtolower($data['email']),
                'phone' => $data['phone'],
                'role' => UserRole::Laboratory,
                'password' => $data['password'],
            ]);
            $profile = $user->laboratoryProfile()->create([
                'name' => $data['laboratory_name'],
                'location_id' => $locationId,
                'address' => $data['address'],
                'proposed_city' => $data['proposed_city'] ?? null,
                'verification_status' => DoctorVerificationStatus::PendingDocuments->value,
            ]);
            $this->verifications->ensure($profile);

            return $user;
        });
        $user->sendEmailVerificationNotification();

        return $user;
    }

    private function listPayload(User $user): array
    {
        $verification = $user->doctorProfile?->verification_status ?? $user->laboratoryProfile?->verification_status;
        if ($verification instanceof DoctorVerificationStatus) {
            $verification = $verification->value;
        }
        $photoPath = $user->profile_image_path
            ?? $user->doctorProfile?->profile_image_path
            ?? $user->laboratoryProfile?->profile_image_path;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role->value,
            'is_active' => $user->is_active,
            'created_at' => $user->created_at?->toIso8601String(),
            'verification_status' => $verification,
            'profile_image_url' => ProfilePhotoService::publicUrl($photoPath),
        ];
    }

    private function detailPayload(User $user): array
    {
        return [
            ...$this->listPayload($user),
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'doctor_profile' => $user->doctorProfile ? [
                'clinic_name' => $user->doctorProfile->clinic_name,
                'specialization' => $user->doctorProfile->specialization?->only(['code', 'name_en', 'name_ar']),
                'location' => $user->doctorProfile->location?->only(['code', 'name_en', 'name_ar']),
            ] : null,
            'laboratory_profile' => $user->laboratoryProfile ? [
                'name' => $user->laboratoryProfile->name,
                'address' => $user->laboratoryProfile->address,
                'location' => $user->laboratoryProfile->location?->only(['code', 'name_en', 'name_ar']),
            ] : null,
        ];
    }
}
