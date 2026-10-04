<?php

namespace App\Console\Commands;

use App\Enums\DoctorVerificationStatus;
use App\Models\DoctorProfile;
use App\Models\LaboratoryProfile;
use App\Models\ProviderVerification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetProviderVerificationCommand extends Command
{
    protected $signature = 'medaccess:reset-demo-provider-verification {--force : Allow running when APP_ENV is production}';

    protected $description = 'One-shot reset of previously auto-verified Doctor and Laboratory accounts to not submitted. Does not delete accounts.';

    public function handle(): int
    {
        if (app()->environment('production') && ! $this->option('force')) {
            $this->error('Refusing to reset provider verification in production without --force.');

            return self::FAILURE;
        }

        $pending = DoctorVerificationStatus::PendingDocuments;

        $counts = DB::transaction(function () use ($pending): array {
            $doctorIds = DoctorProfile::query()
                ->where('verification_status', DoctorVerificationStatus::Verified->value)
                ->pluck('id');
            $labIds = LaboratoryProfile::query()
                ->where('verification_status', DoctorVerificationStatus::Verified->value)
                ->pluck('id');

            DoctorProfile::query()->whereIn('id', $doctorIds)->update(['verification_status' => $pending->value]);
            LaboratoryProfile::query()->whereIn('id', $labIds)->update(['verification_status' => $pending->value]);

            $doctorType = (new DoctorProfile)->getMorphClass();
            $labType = (new LaboratoryProfile)->getMorphClass();

            $verificationQuery = ProviderVerification::query()->where(function ($query) use ($doctorIds, $labIds, $doctorType, $labType): void {
                $query->where(function ($inner) use ($doctorIds, $doctorType): void {
                    $inner->where('verifiable_type', $doctorType)->whereIn('verifiable_id', $doctorIds);
                })->orWhere(function ($inner) use ($labIds, $labType): void {
                    $inner->where('verifiable_type', $labType)->whereIn('verifiable_id', $labIds);
                })->orWhere(function ($inner): void {
                    $inner->where('status', DoctorVerificationStatus::Verified->value)
                        ->whereNull('reviewed_by_user_id');
                });
            });

            $verificationCount = (clone $verificationQuery)->count();
            $verificationQuery->update([
                'status' => $pending->value,
                'submitted_at' => null,
                'reviewed_at' => null,
                'reviewed_by_user_id' => null,
                'admin_note' => null,
            ]);

            return [
                'doctors' => $doctorIds->count(),
                'laboratories' => $labIds->count(),
                'verifications' => $verificationCount,
            ];
        });

        $this->info("Reset {$counts['doctors']} doctor profile(s) and {$counts['laboratories']} laboratory profile(s) to {$pending->value}.");
        $this->info("Synced {$counts['verifications']} provider verification record(s). Documents were kept.");

        return self::SUCCESS;
    }
}
