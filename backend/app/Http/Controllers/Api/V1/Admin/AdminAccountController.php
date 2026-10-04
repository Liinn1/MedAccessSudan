<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminRequest;
use App\Http\Requests\Admin\UpdateAdminRequest;
use App\Mail\AdminInvitationMail;
use App\Models\User;
use App\Services\AdminAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

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
        $data = $request->validated();
        $admin = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'phone' => $data['phone'] ?? null,
            'role' => UserRole::Admin,
            'password' => Str::password(32),
            'email_verified_at' => now(),
            'is_active' => true,
        ]);

        $token = Password::broker()->createToken($admin);
        $url = rtrim((string) config('medaccess.frontend_url'), '/').'/setup-password?'.http_build_query([
            'email' => $admin->email,
            'token' => $token,
        ]);

        try {
            Mail::to($admin->email)->send(new AdminInvitationMail($admin, $url));
        } catch (Throwable) {
            $admin->tokens()->delete();
            $admin->delete();

            return response()->json([
                'message' => 'We could not send the account setup email. Please try again.',
                'code' => 'MAIL_FAILED',
            ], 503);
        }

        $this->audit->record($request->user(), 'admin.created', $admin, ['role' => $admin->role->value]);

        return response()->json([
            'data' => ['admin' => $admin->only(['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at'])],
            'message' => 'Administrator invited.',
        ], 201);
    }

    public function update(UpdateAdminRequest $request, User $admin): JsonResponse
    {
        if (! $admin->role->isAdministrative()) {
            abort(404);
        }
        if ($request->user()->is($admin)) {
            throw ValidationException::withMessages(['admin' => 'You cannot change your own administrative access.']);
        }

        $data = $request->validated();
        if (array_key_exists('role', $data) && $admin->role === UserRole::SuperAdmin && $data['role'] === UserRole::Admin->value) {
            throw ValidationException::withMessages(['admin' => 'The Super Admin role cannot be replaced from this workspace.']);
        }
        if ($admin->role === UserRole::SuperAdmin && (($data['is_active'] ?? true) === false)) {
            throw ValidationException::withMessages(['admin' => 'The Super Admin cannot be suspended from this workspace.']);
        }

        DB::transaction(function () use ($request, $admin, $data): void {
            $before = ['role' => $admin->role->value, 'is_active' => $admin->is_active];
            $admin->update($data);
            if (array_key_exists('is_active', $data) && $data['is_active'] === false) {
                $admin->tokens()->delete();
                $admin->forceFill(['remember_token' => null])->save();
            }
            $this->audit->record($request->user(), 'admin.updated', $admin, ['before' => $before, 'after' => $data]);
        });

        return response()->json([
            'data' => ['admin' => $admin->fresh()->only(['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at'])],
            'message' => 'Administrator access updated.',
        ]);
    }
}
