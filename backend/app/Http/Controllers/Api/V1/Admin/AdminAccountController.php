<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminRequest;
use App\Http\Requests\Admin\UpdateAdminRequest;
use App\Models\User;
use App\Services\AdminAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminAccountController extends Controller
{
    public function __construct(private readonly AdminAuditService $audit) {}

    public function index(): JsonResponse
    {
        $admins = User::query()->whereIn('role', [UserRole::Admin->value, UserRole::SuperAdmin->value])
            ->latest()->get(['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at']);
        return response()->json(['data' => ['admins' => $admins]]);
    }

    public function store(StoreAdminRequest $request): JsonResponse
    {
        $admin = User::create($request->validated());
        $this->audit->record($request->user(), 'admin.created', $admin, ['role' => $admin->role->value]);
        return response()->json(['data' => ['admin' => $admin->only(['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at'])], 'message' => 'Administrator created.'], 201);
    }

    public function update(UpdateAdminRequest $request, User $admin): JsonResponse
    {
        if (! $admin->role->isAdministrative()) abort(404);
        if ($request->user()->is($admin)) throw ValidationException::withMessages(['admin' => 'You cannot change your own administrative access.']);

        $data = $request->validated();
        if ($admin->role === UserRole::SuperAdmin && (($data['role'] ?? null) === UserRole::Admin->value || ($data['is_active'] ?? true) === false)) {
            $activeSuperAdmins = User::where('role', UserRole::SuperAdmin->value)->where('is_active', true)->count();
            if ($activeSuperAdmins <= 1) throw ValidationException::withMessages(['admin' => 'The last active Super Admin cannot be revoked.']);
        }

        DB::transaction(function () use ($request, $admin, $data): void {
            $before = ['role' => $admin->role->value, 'is_active' => $admin->is_active];
            $admin->update($data);
            $this->audit->record($request->user(), 'admin.updated', $admin, ['before' => $before, 'after' => $data]);
        });
        return response()->json(['data' => ['admin' => $admin->fresh()->only(['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at'])], 'message' => 'Administrator access updated.']);
    }
}
