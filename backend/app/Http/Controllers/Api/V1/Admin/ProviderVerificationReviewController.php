<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RequestVerificationChangesRequest;
use App\Http\Requests\Admin\ReviewVerificationDocumentRequest;
use App\Models\ProviderVerification;
use App\Models\VerificationDocument;
use App\Services\ProviderVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProviderVerificationReviewController extends Controller
{
    public function __construct(private readonly ProviderVerificationService $verifications) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => ['verifications' => $this->verifications->listForAdmin()]]);
    }

    public function show(ProviderVerification $verification): JsonResponse
    {
        return response()->json(['data' => $this->verifications->snapshot($verification)]);
    }

    public function download(Request $request, ProviderVerification $verification, VerificationDocument $document): StreamedResponse
    {
        abort_unless($document->provider_verification_id === $verification->id, 404);

        return $this->verifications->download($document, $request->user());
    }

    public function reviewDocument(
        ReviewVerificationDocumentRequest $request,
        ProviderVerification $verification,
        VerificationDocument $document,
    ): JsonResponse {
        $verification = $this->verifications->reviewDocument(
            $verification,
            $document,
            $request->user(),
            $request->validated('status'),
            $request->validated('admin_note'),
        );

        return response()->json(['data' => $this->verifications->snapshot($verification), 'message' => 'Document review saved.']);
    }

    public function requestChanges(RequestVerificationChangesRequest $request, ProviderVerification $verification): JsonResponse
    {
        $verification = $this->verifications->requestChanges(
            $verification,
            $request->user(),
            $request->validated('admin_note'),
        );

        return response()->json(['data' => $this->verifications->snapshot($verification), 'message' => 'Changes requested.']);
    }

    public function approve(Request $request, ProviderVerification $verification): JsonResponse
    {
        $verification = $this->verifications->approve($verification, $request->user());

        return response()->json(['data' => $this->verifications->snapshot($verification), 'message' => 'Provider verification approved.']);
    }
}
