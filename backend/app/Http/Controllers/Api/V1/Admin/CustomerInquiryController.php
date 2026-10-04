<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\CustomerInquiryStatus;
use App\Http\Controllers\Controller;
use App\Mail\InquiryReplyMail;
use App\Models\CustomerInquiry;
use App\Services\AdminAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class CustomerInquiryController extends Controller
{
    public function __construct(private readonly AdminAuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::enum(CustomerInquiryStatus::class)],
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $inquiries = CustomerInquiry::query()
            ->with(['messages' => fn ($query) => $query->orderBy('id')->limit(1)])
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($data['q'] ?? null, function ($query, $search) {
                $like = '%'.$search.'%';
                $query->where(fn ($inner) => $inner->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('subject', 'like', $like));
            })
            ->latest('last_message_at')
            ->limit(100)
            ->get()
            ->map(fn (CustomerInquiry $inquiry) => $this->summary($inquiry));

        return response()->json(['data' => ['inquiries' => $inquiries]]);
    }

    public function show(CustomerInquiry $inquiry): JsonResponse
    {
        $inquiry->load(['messages.admin:id,name']);

        return response()->json(['data' => $this->detail($inquiry)]);
    }

    public function update(Request $request, CustomerInquiry $inquiry): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(CustomerInquiryStatus::class)],
        ]);
        $inquiry->update(['status' => $data['status']]);
        $this->audit->record($request->user(), 'inquiry.status_updated', $inquiry, ['status' => $data['status']]);

        return response()->json(['data' => $this->detail($inquiry->fresh(['messages.admin:id,name']))]);
    }

    public function reply(Request $request, CustomerInquiry $inquiry): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'min:2', 'max:4000'],
        ]);

        $reply = $inquiry->messages()->create([
            'author_type' => 'admin',
            'admin_user_id' => $request->user()->id,
            'body' => trim($data['body']),
        ]);
        $inquiry->update([
            'status' => $inquiry->status === CustomerInquiryStatus::Resolved
                ? CustomerInquiryStatus::Resolved
                : CustomerInquiryStatus::InProgress,
            'last_message_at' => now(),
        ]);

        Mail::to($inquiry->email)->send(new InquiryReplyMail($inquiry->fresh(), $reply));
        $this->audit->record($request->user(), 'inquiry.replied', $inquiry, ['message_id' => $reply->id]);

        return response()->json(['data' => $this->detail($inquiry->fresh(['messages.admin:id,name'])), 'message' => 'Reply sent.']);
    }

    private function summary(CustomerInquiry $inquiry): array
    {
        $preview = $inquiry->messages->first()?->body ?? '';

        return [
            'id' => $inquiry->id,
            'name' => $inquiry->name,
            'email' => $inquiry->email,
            'subject' => $inquiry->subject,
            'status' => $inquiry->status->value,
            'preview' => mb_substr($preview, 0, 140),
            'last_message_at' => $inquiry->last_message_at?->toIso8601String(),
            'created_at' => $inquiry->created_at?->toIso8601String(),
        ];
    }

    private function detail(CustomerInquiry $inquiry): array
    {
        $inquiry->loadMissing(['messages.admin:id,name']);
        $preview = $inquiry->messages->first()?->body ?? '';

        return [
            'id' => $inquiry->id,
            'name' => $inquiry->name,
            'email' => $inquiry->email,
            'subject' => $inquiry->subject,
            'status' => $inquiry->status->value,
            'preview' => mb_substr($preview, 0, 140),
            'last_message_at' => $inquiry->last_message_at?->toIso8601String(),
            'created_at' => $inquiry->created_at?->toIso8601String(),
            'messages' => $inquiry->messages->map(fn ($message) => [
                'id' => $message->id,
                'author_type' => $message->author_type,
                'author_name' => $message->author_type === 'admin' ? ($message->admin?->name ?? 'Admin') : $inquiry->name,
                'body' => $message->body,
                'created_at' => $message->created_at?->toIso8601String(),
            ])->all(),
        ];
    }
}
