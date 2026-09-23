<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AppointmentStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\DoctorReview;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MonitoringController extends Controller
{
    public function users(Request $request): JsonResponse
    {
        $data = $request->validate(['role' => ['nullable', Rule::enum(UserRole::class)], 'status' => ['nullable', 'in:active,inactive']]);
        $query = User::query()->select(['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at'])->latest();
        $query->when($data['role'] ?? null, fn ($q, $role) => $q->where('role', $role));
        $query->when(isset($data['status']), fn ($q) => $q->where('is_active', $data['status'] === 'active'));
        return response()->json(['data' => ['users' => $query->limit(100)->get()]]);
    }

    public function appointments(Request $request): JsonResponse
    {
        $data = $request->validate(['status' => ['nullable', Rule::enum(AppointmentStatus::class)], 'doctor_id' => ['nullable', 'integer'], 'patient_id' => ['nullable', 'integer'], 'date' => ['nullable', 'date']]);
        $query = Appointment::query()->with(['patient:id,name,email', 'doctorProfile.user:id,name,email'])->latest('starts_at');
        $query->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status));
        $query->when($data['doctor_id'] ?? null, fn ($q, $id) => $q->where('doctor_profile_id', $id));
        $query->when($data['patient_id'] ?? null, fn ($q, $id) => $q->where('patient_id', $id));
        $query->when($data['date'] ?? null, fn ($q, $date) => $q->whereDate('starts_at', $date));
        return response()->json(['data' => ['appointments' => $query->limit(100)->get()]]);
    }

    public function reviews(): JsonResponse
    {
        $reviews = DoctorReview::query()->with(['patient:id,name', 'doctorProfile.user:id,name', 'appointment:id,starts_at,status'])->latest()->limit(100)->get();
        return response()->json(['data' => ['reviews' => $reviews]]);
    }
}
