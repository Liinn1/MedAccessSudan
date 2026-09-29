<?php

namespace App\Enums;

enum DoctorVerificationStatus: string
{
    case PendingDocuments = 'pending_documents';
    case UnderReview = 'under_review';
    case Verified = 'verified';
    case ActionRequired = 'action_required';
    case Suspended = 'suspended';

    /**
     * @return list<string>
     */
    public static function incompleteValues(): array
    {
        return [
            self::PendingDocuments->value,
            self::UnderReview->value,
            self::ActionRequired->value,
        ];
    }

    public static function fromAdminInput(string $value): self
    {
        return match ($value) {
            'pending' => self::PendingDocuments,
            'rejected' => self::ActionRequired,
            default => self::from($value),
        };
    }

    public function allowsDocumentUpload(): bool
    {
        return in_array($this, [self::PendingDocuments, self::ActionRequired], true);
    }

    public function documentsAreLocked(): bool
    {
        return in_array($this, [self::UnderReview, self::Verified, self::Suspended], true);
    }
}
