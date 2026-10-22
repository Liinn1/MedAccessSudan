<?php

namespace App\Providers;

use App\Models\Appointment;
use App\Models\CustomerInquiry;
use App\Models\DoctorProfile;
use App\Models\LaboratoryCatalogRequest;
use App\Models\LaboratoryOrder;
use App\Models\LaboratoryProfile;
use App\Models\ProviderVerification;
use App\Models\User;
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
            'customer_inquiry' => CustomerInquiry::class,
            'laboratory_catalog_request' => LaboratoryCatalogRequest::class,
            'laboratory_order' => LaboratoryOrder::class,
            'doctor_profile' => DoctorProfile::class,
            'laboratory_profile' => LaboratoryProfile::class,
            'provider_verification' => ProviderVerification::class,
            'user' => User::class,
        ]);
    }
}
