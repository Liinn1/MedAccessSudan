<?php

namespace App\Services;

use Closure;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ProfilePhotoService
{
    public const VALIDATION_RULES = ['image', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp', 'max:3072'];

    public function store(UploadedFile $photo, string $roleDirectory): string
    {
        $path = $photo->store("profile-photos/{$roleDirectory}", 'public');

        if (! $path) {
            throw new RuntimeException('The profile picture could not be stored.');
        }

        return $path;
    }

    public function replace(UploadedFile $photo, string $roleDirectory, ?string $oldPath, Closure $persist): string
    {
        $newPath = $this->store($photo, $roleDirectory);

        try {
            $persist($newPath);
        } catch (Throwable $error) {
            Storage::disk('public')->delete($newPath);
            throw $error;
        }

        if ($oldPath && $oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return $newPath;
    }

    public function remove(?string $oldPath, Closure $persist): void
    {
        $persist();

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }
    }

    public function discard(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }

    public static function publicUrl(?string $path): ?string
    {
        return $path ? url(Storage::disk('public')->url($path)) : null;
    }
}
