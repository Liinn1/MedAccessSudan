<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\CustomerInquiryStatus;
use App\Http\Controllers\Controller;
use App\Models\CustomerInquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicContactController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $inquiry = CustomerInquiry::query()->create([
            'name' => trim($data['name']),
            'email' => strtolower(trim($data['email'])),
            'subject' => trim($data['subject']),
            'status' => CustomerInquiryStatus::New,
            'last_message_at' => now(),
        ]);
        $inquiry->messages()->create([
            'author_type' => 'customer',
            'body' => trim($data['message']),
        ]);

        return response()->json([
            'data' => ['id' => $inquiry->id],
            'message' => 'Your message was sent to MedAccess.',
        ], 201);
    }
}
