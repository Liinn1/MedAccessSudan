<?php

namespace App\Services;

use App\Models\DoctorProfile;

class BiographyTranslationService
{
    /**
     * Select a cached translation for display without changing the doctor's source text.
     *
     * No machine-translation provider is configured yet, so a missing cache safely
     * falls back to the authoritative biography until a provider is connected here.
     *
     * @return array{text:?string,source_language:?string,target_language:string,is_translated:bool}
     */
    public function forDisplay(DoctorProfile $profile, string $requestedLanguage): array
    {
        $target = str_starts_with($requestedLanguage, 'ar') ? 'ar' : 'en';
        $source = $profile->biography_language;
        $cached = $target === 'ar' ? $profile->bio_ar : $profile->bio_en;

        return [
            'text' => $cached ?: $profile->biography,
            'source_language' => $source,
            'target_language' => $target,
            'is_translated' => (bool) $cached && $source !== null && $source !== $target,
        ];
    }
}
