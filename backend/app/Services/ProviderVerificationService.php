<?php

namespace App\Services;

use App\Enums\DoctorVerificationStatus;
use App\Enums\UserRole;
use App\Enums\VerificationDocumentStatus;
use App\Models\DoctorProfile;
use App\Models\LaboratoryProfile;
use App\Models\ProviderVerification;
use App\Models\User;
use App\Models\VerificationDocument;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProviderVerificationService
{
    public const DISK = 'local';

    public function __construct(private readonly AdminAuditService $audit) {}

    public function ensure(DoctorProfile|LaboratoryProfile $profile): ProviderVerification
    {
        $verification = $profile->providerVerification()->first();

        if (! $verification) {
            $initial = DoctorVerificationStatus::fromAdminInput((string) ($profile->verification_status ?: 'pending_documents'));
            if ($initial === DoctorVerificationStatus::Verified) {
                $initial = DoctorVerificationStatus::PendingDocuments;
            }
            $verification = $profile->providerVerification()->create([
                'status' => $initial,
            ]);
        }

        $status = $this->status($verification);
        if ($status === DoctorVerificationStatus::Verified && $verification->reviewed_by_user_id === null) {
            $this->applyStatus($verification, DoctorVerificationStatus::PendingDocuments, [
                'submitted_at' => null,
                'reviewed_at' => null,
                'reviewed_by_user_id' => null,
                'admin_note' => null,
            ]);
            $verification = $verification->fresh(['documents', 'reviewer:id,name']) ?? $verification;
            $status = DoctorVerificationStatus::PendingDocuments;
        }

        if ((string) $profile->verification_status !== $status->value) {
            $profile->update(['verification_status' => $status->value]);
            $profile->verification_status = $status->value;
        }

        return $verification;
    }

    public function forUser(User $user): ProviderVerification
    {
        $profile = $this->profileForUser($user);

        return $this->ensure($profile)->load(['documents', 'reviewer:id,name']);
    }

    public function snapshot(ProviderVerification $verification): array
    {
        $verification->loadMissing(['verifiable.user:id,name,email,phone', 'documents', 'reviewer:id,name']);
        $profile = $verification->verifiable;
        $providerType = $this->providerType($profile);
        $required = $this->requiredTypes($providerType);
        $current = $this->currentDocuments($verification);
        $status = $verification->status instanceof DoctorVerificationStatus
            ? $verification->status
            : DoctorVerificationStatus::fromAdminInput((string) $verification->status);

        $requirements = collect($required)->map(function (string $type) use ($current) {
            $document = $current->get($type);

            return [
                'document_type' => $type,
                'required' => true,
                'current' => $document ? $this->documentPayload($document) : null,
            ];
        })->all();

        $submittedCount = collect($requirements)->filter(fn (array $item) => $item['current'] && $item['current']['status'] !== VerificationDocumentStatus::Rejected->value)->count();
        $rejectedCount = collect($requirements)->filter(fn (array $item) => ($item['current']['status'] ?? null) === VerificationDocumentStatus::Rejected->value)->count();
        $approvedCount = collect($requirements)->filter(fn (array $item) => ($item['current']['status'] ?? null) === VerificationDocumentStatus::Approved->value)->count();

        return [
            'id' => $verification->id,
            'provider_type' => $providerType,
            'provider_name' => $this->providerName($profile),
            'status' => $status->value,
            'admin_note' => $verification->admin_note,
            'submitted_at' => $verification->submitted_at?->toIso8601String(),
            'reviewed_at' => $verification->reviewed_at?->toIso8601String(),
            'reviewed_by' => $verification->reviewer?->only(['id', 'name']),
            'required_count' => count($required),
            'submitted_count' => $submittedCount,
            'approved_count' => $approvedCount,
            'rejected_count' => $rejectedCount,
            'can_submit' => $status->allowsDocumentUpload() && $submittedCount === count($required) && $rejectedCount === 0,
            'can_upload' => $status->allowsDocumentUpload(),
            'documents_locked' => $status->documentsAreLocked(),
            'requirements' => $requirements,
            'profile_summary' => $this->profileSummary($profile),
        ];
    }

    public function upload(User $user, string $documentType, UploadedFile $file): ProviderVerification
    {
        $verification = $this->forUser($user);
        $this->assertOwnedBy($verification, $user);
        $status = $this->status($verification);
        if (! $status->allowsDocumentUpload()) {
            throw ValidationException::withMessages(['file' => 'Verification documents cannot be changed while this submission is locked.']);
        }

        $required = $this->requiredTypes($this->providerType($verification->verifiable));
        if (! in_array($documentType, $required, true)) {
            throw ValidationException::withMessages(['document_type' => 'This document type is not required for this provider.']);
        }

        $current = $this->currentDocuments($verification)->get($documentType);
        if ($status === DoctorVerificationStatus::ActionRequired) {
            if (! $current || $current->status !== VerificationDocumentStatus::Rejected) {
                throw ValidationException::withMessages(['document_type' => 'Only documents that require replacement can be changed.']);
            }
        }

        $stored = $this->storeFile($verification, $file);

        return DB::transaction(function () use ($verification, $documentType, $stored, $current, $status) {
            if ($current) {
                $current->update(['status' => VerificationDocumentStatus::Replaced]);
            }

            $verification->documents()->create([
                'document_type' => $documentType,
                'original_filename' => $stored['original_filename'],
                'disk' => self::DISK,
                'path' => $stored['path'],
                'mime_type' => $stored['mime_type'],
                'size_bytes' => $stored['size_bytes'],
                'status' => VerificationDocumentStatus::Pending,
                'admin_note' => null,
                'uploaded_at' => now(),
            ]);

            $fresh = $verification->fresh(['documents', 'reviewer:id,name']);
            if ($status === DoctorVerificationStatus::ActionRequired && $fresh) {
                $snapshot = $this->snapshot($fresh);
                if ($snapshot['rejected_count'] === 0 && $snapshot['submitted_count'] === $snapshot['required_count']) {
                    $this->applyStatus($fresh, DoctorVerificationStatus::UnderReview, [
                        'submitted_at' => now(),
                    ]);
                    $fresh = $fresh->fresh(['documents', 'reviewer:id,name']);
                }
            }

            return $fresh ?? $verification;
        });
    }

    public function submit(User $user): ProviderVerification
    {
        $verification = $this->forUser($user);
        $this->assertOwnedBy($verification, $user);
        $status = $this->status($verification);
        if (! $status->allowsDocumentUpload()) {
            throw ValidationException::withMessages(['status' => 'This verification cannot be submitted in its current state.']);
        }

        $snapshot = $this->snapshot($verification);
        if (! $snapshot['can_submit']) {
            throw ValidationException::withMessages(['documents' => 'Upload every required document before submitting for review.']);
        }

        $this->applyStatus($verification, DoctorVerificationStatus::UnderReview, [
            'submitted_at' => now(),
            'admin_note' => $status === DoctorVerificationStatus::ActionRequired ? $verification->admin_note : null,
        ]);

        return $verification->fresh(['documents', 'reviewer:id,name']);
    }

    public function download(VerificationDocument $document, User $user): StreamedResponse
    {
        $document->load('verification.verifiable.user');
        $this->authorizeDocument($document, $user);

        $disk = Storage::disk($document->disk);
        if (! $disk->exists($document->path)) {
            abort(404);
        }

        $downloadName = basename((string) $document->original_filename) ?: 'verification-document';

        return $disk->download($document->path, $downloadName, [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline; filename="'.$downloadName.'"',
        ]);
    }

    /**
     * @param  array{provider_type?: string, status?: string}  $filters
     * @return list<array<string, mixed>>
     */
    public function listForAdmin(array $filters = []): array
    {
        $query = ProviderVerification::query()
            ->with(['verifiable.user:id,name,email,phone', 'reviewer:id,name'])
            ->when(($filters['status'] ?? null), fn ($builder, $status) => $builder->where('status', $status))
            ->orderByRaw('submitted_at is null')
            ->latest('submitted_at');

        return $query->get()
            ->map(function (ProviderVerification $verification) use ($filters) {
                $snapshot = $this->snapshot($verification);
                if (($filters['provider_type'] ?? null) && $snapshot['provider_type'] !== $filters['provider_type']) {
                    return null;
                }
                $user = $verification->verifiable?->user;

                return [
                    'id' => $verification->id,
                    'provider_type' => $snapshot['provider_type'],
                    'provider_name' => $snapshot['provider_name'],
                    'status' => $snapshot['status'],
                    'submitted_at' => $snapshot['submitted_at'],
                    'reviewed_at' => $snapshot['reviewed_at'],
                    'required_count' => $snapshot['required_count'],
                    'submitted_count' => $snapshot['submitted_count'],
                    'user' => $user ? $user->only(['id', 'name', 'email', 'phone']) : null,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    public function reviewDocument(ProviderVerification $verification, VerificationDocument $document, User $admin, string $decision, ?string $note): ProviderVerification
    {
        abort_unless($document->provider_verification_id === $verification->id, 404);
        abort_unless($document->status !== VerificationDocumentStatus::Replaced, 422);

        $status = $decision === VerificationDocumentStatus::Rejected->value
            ? VerificationDocumentStatus::Rejected
            : VerificationDocumentStatus::Approved;

        if ($status === VerificationDocumentStatus::Rejected && blank($note)) {
            throw ValidationException::withMessages(['admin_note' => 'Provide a reason when requesting a document replacement.']);
        }

        if ($status === VerificationDocumentStatus::Rejected && $document->status === VerificationDocumentStatus::Rejected) {
            throw ValidationException::withMessages(['status' => 'A replacement has already been requested for this document.']);
        }

        $document->update([
            'status' => $status,
            'admin_note' => $status === VerificationDocumentStatus::Rejected ? trim((string) $note) : null,
        ]);

        if ($status === VerificationDocumentStatus::Rejected) {
            $this->applyStatus($verification, DoctorVerificationStatus::ActionRequired, [
                'reviewed_at' => now(),
                'reviewed_by_user_id' => $admin->id,
            ], $admin, 'provider.verification.document_rejected', [
                'document_id' => $document->id,
                'document_type' => $document->document_type,
            ]);
        } else {
            $this->audit->record($admin, 'provider.verification.document_approved', $verification, [
                'document_id' => $document->id,
                'document_type' => $document->document_type,
            ]);
        }

        $verification = $verification->fresh(['documents', 'reviewer:id,name', 'verifiable']) ?? $verification;
        $snapshot = $this->snapshot($verification);
        if (
            $this->status($verification) === DoctorVerificationStatus::ActionRequired
            && $snapshot['rejected_count'] === 0
            && $snapshot['submitted_count'] === $snapshot['required_count']
        ) {
            $this->applyStatus($verification, DoctorVerificationStatus::UnderReview);
            $verification = $verification->fresh(['documents', 'reviewer:id,name', 'verifiable']) ?? $verification;
        }

        return $verification;
    }

    public function requestChanges(ProviderVerification $verification, User $admin, string $note): ProviderVerification
    {
        if (blank($note)) {
            throw ValidationException::withMessages(['admin_note' => 'Provide a reason when requesting changes.']);
        }

        if ($this->status($verification) !== DoctorVerificationStatus::UnderReview) {
            throw ValidationException::withMessages(['status' => 'Only submitted verification requests can be rejected.']);
        }

        $this->applyStatus($verification, DoctorVerificationStatus::ActionRequired, [
            'reviewed_at' => now(),
            'reviewed_by_user_id' => $admin->id,
            'admin_note' => trim($note),
        ], $admin, 'provider.verification.action_required');

        return $verification->fresh(['documents', 'reviewer:id,name', 'verifiable']);
    }

    public function approve(ProviderVerification $verification, User $admin): ProviderVerification
    {
        $profile = $verification->verifiable;
        if ($profile instanceof DoctorProfile) {
            $this->assertDoctorCanBeVerified($profile);
        }

        $current = $this->currentDocuments($verification);
        $required = $this->requiredTypes($this->providerType($profile));
        $allApproved = $current->count() === count($required)
            && $current->every(fn (VerificationDocument $document) => $document->status === VerificationDocumentStatus::Approved);

        if (! $allApproved) {
            throw ValidationException::withMessages([
                'status' => 'All required verification documents must be approved before the provider can be verified.',
            ]);
        }

        if ($this->status($verification) !== DoctorVerificationStatus::UnderReview) {
            throw ValidationException::withMessages(['status' => 'Only submitted verification requests can be approved.']);
        }

        $this->applyStatus($verification, DoctorVerificationStatus::Verified, [
            'reviewed_at' => now(),
            'reviewed_by_user_id' => $admin->id,
            'admin_note' => null,
        ], $admin, 'provider.verification.approved');

        return $verification->fresh(['documents', 'reviewer:id,name', 'verifiable']);
    }

    public function syncLegacyStatus(DoctorProfile $doctor, DoctorVerificationStatus $status, User $admin): void
    {
        $verification = $this->ensure($doctor);
        $this->applyStatus($verification, $status, [
            'reviewed_at' => now(),
            'reviewed_by_user_id' => $admin->id,
        ], $admin, 'provider.verification_updated');
    }

    public function profileForUser(User $user): DoctorProfile|LaboratoryProfile
    {
        if ($user->role === UserRole::Doctor && $user->doctorProfile) {
            return $user->doctorProfile;
        }
        if ($user->role === UserRole::Laboratory && $user->laboratoryProfile) {
            return $user->laboratoryProfile;
        }

        abort(403);
    }

    /**
     * @return list<string>
     */
    public function requiredTypes(string $providerType): array
    {
        $types = config('medaccess.provider_verification.requirements.'.$providerType, []);

        return array_values($types);
    }

    private function applyStatus(
        ProviderVerification $verification,
        DoctorVerificationStatus $status,
        array $attributes = [],
        ?User $admin = null,
        ?string $auditAction = null,
        array $auditMeta = [],
    ): void {
        $verification->fill([
            'status' => $status,
            ...$attributes,
        ])->save();

        $profile = $verification->verifiable;
        if ($profile instanceof DoctorProfile || $profile instanceof LaboratoryProfile) {
            $profile->update(['verification_status' => $status->value]);
        }

        if ($admin && $auditAction) {
            $this->audit->record($admin, $auditAction, $verification, ['status' => $status->value, ...$auditMeta]);
        }
    }

    private function assertDoctorCanBeVerified(DoctorProfile $doctor): void
    {
        $doctor->load(['location', 'specialization', 'cityProposal']);

        if (! $doctor->location_id || ! $doctor->location?->is_active) {
            throw ValidationException::withMessages(['status' => 'Resolve the provider city before verification.']);
        }
        if (! $doctor->specialization?->is_active) {
            throw ValidationException::withMessages(['status' => 'The provider specialization must be active before verification.']);
        }
        if (! $doctor->profile_image_path) {
            throw ValidationException::withMessages(['status' => 'A provider profile picture is required before verification.']);
        }
        if ($doctor->cityProposal?->status?->value === 'pending') {
            throw ValidationException::withMessages(['status' => 'Resolve the pending city proposal before verification.']);
        }
    }

    /**
     * @return \Illuminate\Support\Collection<string, VerificationDocument>
     */
    private function currentDocuments(ProviderVerification $verification)
    {
        $verification->loadMissing('documents');

        return $verification->documents
            ->filter(fn (VerificationDocument $document) => $document->status !== VerificationDocumentStatus::Replaced)
            ->sortByDesc('id')
            ->unique('document_type')
            ->keyBy('document_type');
    }

    /**
     * @return array{path: string, original_filename: string, mime_type: string, size_bytes: int}
     */
    private function storeFile(ProviderVerification $verification, UploadedFile $file): array
    {
        $maxKilobytes = (int) config('medaccess.provider_verification.max_kilobytes', 8192);
        if (($file->getSize() ?: 0) > $maxKilobytes * 1024) {
            throw ValidationException::withMessages(['file' => 'The document exceeds the maximum allowed size.']);
        }

        $mime = $this->detectMime($file);
        $allowed = config('medaccess.provider_verification.allowed_mime_types', [
            'application/pdf',
            'image/jpeg',
            'image/png',
        ]);
        if (! in_array($mime, $allowed, true)) {
            throw ValidationException::withMessages(['file' => 'Upload a PDF, JPEG, or PNG document.']);
        }

        $extension = match ($mime) {
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            default => throw new RuntimeException('UNSUPPORTED_VERIFICATION_MIME'),
        };

        $directory = 'provider-verifications/'.$verification->id;
        $filename = Str::uuid()->toString().'.'.$extension;
        $path = $file->storeAs($directory, $filename, self::DISK);
        if (! $path) {
            throw ValidationException::withMessages(['file' => 'The document could not be stored.']);
        }

        return [
            'path' => $path,
            'original_filename' => Str::limit($file->getClientOriginalName() ?: $filename, 240, ''),
            'mime_type' => $mime,
            'size_bytes' => $file->getSize() ?: 0,
        ];
    }

    private function detectMime(UploadedFile $file): string
    {
        $path = $file->getRealPath();
        if (! $path) {
            return '';
        }

        $detected = (new \finfo(FILEINFO_MIME_TYPE))->file($path) ?: '';

        return $detected === 'image/jpg' ? 'image/jpeg' : $detected;
    }

    private function authorizeDocument(VerificationDocument $document, User $user): void
    {
        if (in_array($user->role, [UserRole::Admin, UserRole::SuperAdmin], true)) {
            return;
        }

        $owner = $document->verification?->verifiable?->user;
        if ($owner && (int) $owner->id === (int) $user->id) {
            return;
        }

        abort(403);
    }

    private function assertOwnedBy(ProviderVerification $verification, User $user): void
    {
        $owner = $verification->verifiable?->user;
        abort_unless($owner && (int) $owner->id === (int) $user->id, 403);
    }

    private function status(ProviderVerification $verification): DoctorVerificationStatus
    {
        return $verification->status instanceof DoctorVerificationStatus
            ? $verification->status
            : DoctorVerificationStatus::fromAdminInput((string) $verification->status);
    }

    private function providerType(mixed $profile): string
    {
        return $profile instanceof LaboratoryProfile ? 'laboratory' : 'doctor';
    }

    private function providerName(mixed $profile): string
    {
        if ($profile instanceof LaboratoryProfile) {
            return (string) $profile->name;
        }
        if ($profile instanceof DoctorProfile) {
            return (string) ($profile->user?->name ?? '');
        }

        return '';
    }

    private function profileSummary(mixed $profile): array
    {
        if ($profile instanceof DoctorProfile) {
            $profile->loadMissing(['specialization:id,code,name_en,name_ar', 'location:id,code,name_en,name_ar', 'user:id,name,email,phone']);

            return [
                'email' => $profile->user?->email,
                'phone' => $profile->user?->phone,
                'specialization' => $profile->specialization?->only(['code', 'name_en', 'name_ar']),
                'location' => $profile->location?->only(['code', 'name_en', 'name_ar']),
                'clinic_name' => $profile->clinic_name,
                'address' => null,
            ];
        }
        if ($profile instanceof LaboratoryProfile) {
            $profile->loadMissing(['location:id,code,name_en,name_ar', 'user:id,name,email,phone']);

            return [
                'email' => $profile->user?->email,
                'phone' => $profile->user?->phone,
                'specialization' => null,
                'location' => $profile->location?->only(['code', 'name_en', 'name_ar']),
                'clinic_name' => null,
                'address' => $profile->address,
            ];
        }

        return [];
    }

    /**
     * @return array<string, mixed>
     */
    private function documentPayload(VerificationDocument $document): array
    {
        return [
            'id' => $document->id,
            'document_type' => $document->document_type,
            'original_filename' => $document->original_filename,
            'mime_type' => $document->mime_type,
            'file_size' => $document->size_bytes,
            'status' => $document->status instanceof VerificationDocumentStatus
                ? $document->status->value
                : $document->status,
            'admin_note' => $document->admin_note,
            'uploaded_at' => $document->uploaded_at?->toIso8601String(),
        ];
    }
}
