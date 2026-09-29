<?php

namespace App\Services;

use App\Enums\LaboratoryOrderStatus;
use App\Models\LaboratoryOrder;
use App\Models\LaboratoryResult;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LaboratoryResultFileService
{
    public const DISK = 'local';

    public const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    /**
     * Store on the private disk. The public disk is never used for lab results.
     */
    public function store(LaboratoryOrder $order, UploadedFile $file, User $uploader): LaboratoryResult
    {
        $mime = $this->detectMime($file);
        if (! in_array($mime, self::ALLOWED_MIME_TYPES, true)) {
            throw new RuntimeException('RESULT_FILE_TYPE_INVALID');
        }

        $extension = match ($mime) {
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'bin',
        };

        $directory = 'laboratory-results/'.$order->id;
        $filename = Str::uuid()->toString().'.'.$extension;
        $path = $file->storeAs($directory, $filename, self::DISK);

        if (! $path) {
            throw new RuntimeException('RESULT_FILE_STORE_FAILED');
        }

        return LaboratoryResult::query()->create([
            'laboratory_order_id' => $order->id,
            'uploaded_by_user_id' => $uploader->id,
            'disk' => self::DISK,
            'path' => $path,
            'original_filename' => Str::limit($file->getClientOriginalName() ?: $filename, 240, ''),
            'mime_type' => $mime,
            'size_bytes' => $file->getSize() ?: 0,
        ]);
    }

    public function download(LaboratoryResult $result): StreamedResponse
    {
        $disk = Storage::disk($result->disk);
        if (! $disk->exists($result->path)) {
            abort(404);
        }

        $downloadName = basename($result->original_filename) ?: 'laboratory-result';

        return $disk->download($result->path, $downloadName, [
            'Content-Type' => $result->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline; filename="'.$downloadName.'"',
        ]);
    }

    private function detectMime(UploadedFile $file): string
    {
        $path = $file->getRealPath();
        if (! $path) {
            return '';
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $detected = $finfo->file($path) ?: '';

        return $detected === 'image/jpg' ? 'image/jpeg' : $detected;
    }
}
