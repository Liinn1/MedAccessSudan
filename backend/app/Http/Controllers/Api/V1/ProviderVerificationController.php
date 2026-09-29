<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProviderVerification\UploadVerificationDocumentRequest;
use App\Models\VerificationDocument;
use App\Services\ProviderVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProviderVerificationController extends Controller
{
    public function __construct(private readonly ProviderVerificationService $verifications) {}

    public function show(Request $request): JsonResponse
    {
        $verification = $this->verifications->forUser($request->user());

        return response()->json(['data' => $this->verifications->snapshot($verification)]);
    }

    public function upload(UploadVerificationDocumentRequest $request): JsonResponse
    {
        $verification = $this->verifications->upload(
            $request->user(),
            $request->validated('document_type'),
            $request->file('file'),
        );

        return response()->json(['data' => $this->verifications->snapshot($verification), 'message' => 'Document uploaded.']);
    }

    public function submit(Request $request): JsonResponse
    {
        $verification = $this->verifications->submit($request->user());

        return response()->json(['data' => $this->verifications->snapshot($verification), 'message' => 'Verification submitted for review.']);
    }

    public function download(Request $request, VerificationDocument $document): StreamedResponse
    {
        return $this->verifications->download($document, $request->user());
    }
}
