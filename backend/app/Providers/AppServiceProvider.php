<?php

namespace App\Providers;

use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\LaboratoryOrder;
use App\Models\LaboratoryProfile;
use App\Models\ProviderVerification;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Relation::enforceMorphMap([
            'appointment' => Appointment::class,
            'laboratory_order' => LaboratoryOrder::class,
            'doctor_profile' => DoctorProfile::class,
            'laboratory_profile' => LaboratoryProfile::class,
            'provider_verification' => ProviderVerification::class,
        ]);
    }
}
