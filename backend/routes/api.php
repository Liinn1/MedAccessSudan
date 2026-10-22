<?php

use App\Http\Controllers\Api\V1\Admin\AdminAccountController;
use App\Http\Controllers\Api\V1\Admin\AdminLoginController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\CatalogRequestReviewController;
use App\Http\Controllers\Api\V1\Admin\CustomerInquiryController;
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\DoctorVerificationController;
use App\Http\Controllers\Api\V1\Admin\LocationController;
use App\Http\Controllers\Api\V1\Admin\MonitoringController;
use App\Http\Controllers\Api\V1\Admin\ProviderVerificationReviewController;
use App\Http\Controllers\Api\V1\Auth\CompletePasswordSetupController;
use App\Http\Controllers\Api\V1\Auth\CurrentUserController;
use App\Http\Controllers\Api\V1\Auth\DoctorRegistrationOptionsController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\PasswordChangeController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\Auth\RegisterDoctorController;
use App\Http\Controllers\Api\V1\Auth\RegisterLaboratoryController;
use App\Http\Controllers\Api\V1\Auth\RegisterPatientController;
use App\Http\Controllers\Api\V1\Auth\ResendEmailVerificationController;
use App\Http\Controllers\Api\V1\Doctor\AppointmentController as DoctorAppointmentController;
use App\Http\Controllers\Api\V1\Doctor\AvailabilityExceptionController;
use App\Http\Controllers\Api\V1\Doctor\DoctorDashboardController;
use App\Http\Controllers\Api\V1\Doctor\ProfileController as DoctorProfessionalProfileController;
use App\Http\Controllers\Api\V1\Doctor\ProfilePhotoController as DoctorProfilePhotoController;
use App\Http\Controllers\Api\V1\Doctor\ResolvedAvailabilityController;
use App\Http\Controllers\Api\V1\Doctor\ScheduleController;
use App\Http\Controllers\Api\V1\FeaturedDoctorController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Laboratory\CatalogController as LaboratoryCatalogController;
use App\Http\Controllers\Api\V1\Laboratory\CatalogRequestController as LaboratoryCatalogRequestController;
use App\Http\Controllers\Api\V1\Laboratory\DashboardController as LaboratoryDashboardController;
use App\Http\Controllers\Api\V1\Laboratory\OfferingController as LaboratoryOfferingController;
use App\Http\Controllers\Api\V1\Laboratory\OrderController as LaboratoryOrderController;
use App\Http\Controllers\Api\V1\Laboratory\ProfileController as LaboratoryProfileController;
use App\Http\Controllers\Api\V1\Laboratory\ProfilePhotoController as LaboratoryProfilePhotoController;
use App\Http\Controllers\Api\V1\Laboratory\ResultController as LaboratoryResultController;
use App\Http\Controllers\Api\V1\Patient\AppointmentController as PatientAppointmentController;
use App\Http\Controllers\Api\V1\Patient\DoctorAvailabilityController;
use App\Http\Controllers\Api\V1\Patient\DoctorFilterController;
use App\Http\Controllers\Api\V1\Patient\DoctorProfileController;
use App\Http\Controllers\Api\V1\Patient\DoctorSearchController;
use App\Http\Controllers\Api\V1\Patient\GlobalSearchController;
use App\Http\Controllers\Api\V1\Patient\LaboratoryDiscoveryController;
use App\Http\Controllers\Api\V1\Patient\LaboratoryOrderController as PatientLaboratoryOrderController;
use App\Http\Controllers\Api\V1\Patient\PatientHomeController;
use App\Http\Controllers\Api\V1\Patient\ProfileController as PatientProfileController;
use App\Http\Controllers\Api\V1\Patient\ProfilePhotoController as PatientProfilePhotoController;
use App\Http\Controllers\Api\V1\Patient\ProviderReviewController;
use App\Http\Controllers\Api\V1\Patient\UpcomingBookingController;
use App\Http\Controllers\Api\V1\ProviderVerificationController;
use App\Http\Controllers\Api\V1\PublicContactController;
use Illuminate\Support\Facades\Route;

Route::get('/v1/health', HealthController::class);
Route::post('/v1/contact', PublicContactController::class)->middleware('throttle:8,1');
Route::get('/v1/doctors/featured', FeaturedDoctorController::class);
Route::post('/v1/admin/login', AdminLoginController::class)->middleware('throttle:5,1');

Route::prefix('v1/auth')->group(function () {
    Route::post('/login', LoginController::class);
    Route::post('/register', RegisterPatientController::class)->middleware('throttle:5,1');
    Route::get('/doctor-registration-options', DoctorRegistrationOptionsController::class);
    Route::post('/register/doctor', RegisterDoctorController::class)->middleware('throttle:5,1');
    Route::post('/register/laboratory', RegisterLaboratoryController::class)->middleware('throttle:5,1');
    Route::post('/email/verification-notification', ResendEmailVerificationController::class)->middleware('throttle:6,1');

    Route::post('/password/setup', CompletePasswordSetupController::class)->middleware('throttle:8,1');
    Route::post('/password/forgot', [PasswordResetController::class, 'start'])->middleware('throttle:5,1');
    Route::post('/password/forgot/resend', [PasswordResetController::class, 'resend'])->middleware('throttle:6,1');
    Route::post('/password/reset', [PasswordResetController::class, 'reset'])->middleware('throttle:8,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', CurrentUserController::class);
        Route::post('/logout', LogoutController::class);
        Route::post('/password/change', [PasswordChangeController::class, 'start'])->middleware('throttle:8,1');
        Route::post('/password/change/resend', [PasswordChangeController::class, 'resend'])->middleware('throttle:12,1');
        Route::post('/password/change/confirm', [PasswordChangeController::class, 'confirm'])->middleware('throttle:12,1');
    });
});

Route::middleware(['auth:sanctum', 'role:patient'])
    ->prefix('v1/patient')
    ->group(function (): void {
        Route::get('/home', PatientHomeController::class);
        Route::get('/search', GlobalSearchController::class)->middleware('throttle:60,1');
        Route::get('/doctor-filters', DoctorFilterController::class);
        Route::get('/doctors', DoctorSearchController::class);
        Route::get('/doctors/{doctor}', DoctorProfileController::class)->whereNumber('doctor');
        Route::get('/doctors/{doctor}/availability', DoctorAvailabilityController::class)->whereNumber('doctor');
        Route::get('/appointments', [PatientAppointmentController::class, 'index']);
        Route::get('/upcoming-bookings', UpcomingBookingController::class);
        Route::post('/appointments', [PatientAppointmentController::class, 'store']);
        Route::get('/appointments/{appointment}', [PatientAppointmentController::class, 'show'])->whereNumber('appointment');
        Route::patch('/appointments/{appointment}/cancel', [PatientAppointmentController::class, 'cancel'])->whereNumber('appointment');
        Route::post('/appointments/{appointment}/review', [ProviderReviewController::class, 'storeForAppointment'])->whereNumber('appointment');
        Route::put('/profile', [PatientProfileController::class, 'update']);
        Route::post('/profile-photo', [PatientProfilePhotoController::class, 'store']);
        Route::delete('/profile-photo', [PatientProfilePhotoController::class, 'destroy']);
        Route::get('/laboratory-offerings', LaboratoryDiscoveryController::class);
        Route::get('/laboratory-orders', [PatientLaboratoryOrderController::class, 'index']);
        Route::post('/laboratory-orders', [PatientLaboratoryOrderController::class, 'store']);
        Route::get('/laboratory-orders/{order}', [PatientLaboratoryOrderController::class, 'show'])->whereNumber('order');
        Route::get('/laboratory-orders/{order}/result', [PatientLaboratoryOrderController::class, 'download'])->whereNumber('order');
        Route::post('/laboratory-orders/{order}/review', [ProviderReviewController::class, 'storeForLaboratoryOrder'])->whereNumber('order');
    });

Route::middleware(['auth:sanctum', 'role:doctor'])
    ->prefix('v1/doctor')
    ->group(function (): void {
        Route::get('/dashboard', DoctorDashboardController::class);
        Route::get('/schedule', [ScheduleController::class, 'index']);
        Route::get('/resolved-availability', ResolvedAvailabilityController::class);
        Route::put('/schedule', [ScheduleController::class, 'replace']);
        Route::post('/schedule/exceptions', [AvailabilityExceptionController::class, 'store']);
        Route::put('/schedule/exceptions/{exception}', [AvailabilityExceptionController::class, 'update'])->whereNumber('exception');
        Route::delete('/schedule/exceptions/{exception}', [AvailabilityExceptionController::class, 'destroy'])->whereNumber('exception');
        Route::get('/appointments', [DoctorAppointmentController::class, 'index']);
        Route::patch('/appointments/{appointment}/start', [DoctorAppointmentController::class, 'start'])->whereNumber('appointment');
        Route::patch('/appointments/{appointment}/complete', [DoctorAppointmentController::class, 'complete'])->whereNumber('appointment');
        Route::put('/profile', [DoctorProfessionalProfileController::class, 'update']);
        Route::post('/profile-photo', [DoctorProfilePhotoController::class, 'store']);
        Route::get('/verification', [ProviderVerificationController::class, 'show']);
        Route::post('/verification/documents', [ProviderVerificationController::class, 'upload']);
        Route::post('/verification/submit', [ProviderVerificationController::class, 'submit']);
        Route::get('/verification/documents/{document}', [ProviderVerificationController::class, 'download'])->whereNumber('document');
    });

Route::middleware(['auth:sanctum', 'role:laboratory'])
    ->prefix('v1/laboratory')
    ->group(function (): void {
        Route::get('/dashboard', LaboratoryDashboardController::class);
        Route::get('/catalog', LaboratoryCatalogController::class);
        Route::put('/offerings/{labTest}', [LaboratoryOfferingController::class, 'upsert'])->whereNumber('labTest');
        Route::post('/catalog-requests', [LaboratoryCatalogRequestController::class, 'store']);
        Route::get('/orders', [LaboratoryOrderController::class, 'index']);
        Route::get('/orders/{order}', [LaboratoryOrderController::class, 'show'])->whereNumber('order');
        Route::patch('/orders/{order}/status', [LaboratoryOrderController::class, 'transition'])->whereNumber('order');
        Route::post('/orders/{order}/result', [LaboratoryResultController::class, 'store'])->whereNumber('order');
        Route::get('/orders/{order}/result', [LaboratoryResultController::class, 'download'])->whereNumber('order');
        Route::get('/profile', [LaboratoryProfileController::class, 'show']);
        Route::put('/profile', [LaboratoryProfileController::class, 'update']);
        Route::post('/profile-photo', [LaboratoryProfilePhotoController::class, 'store']);
        Route::get('/verification', [ProviderVerificationController::class, 'show']);
        Route::post('/verification/documents', [ProviderVerificationController::class, 'upload']);
        Route::post('/verification/submit', [ProviderVerificationController::class, 'submit']);
        Route::get('/verification/documents/{document}', [ProviderVerificationController::class, 'download'])->whereNumber('document');
    });

Route::middleware(['auth:sanctum', 'role:admin,super_admin'])
    ->prefix('v1/admin')
    ->group(function (): void {
        Route::get('/dashboard', AdminDashboardController::class);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::get('/users/{user}', [AdminUserController::class, 'show'])->whereNumber('user');
        Route::patch('/users/{user}', [AdminUserController::class, 'update'])->whereNumber('user');
        Route::put('/profile', [AdminUserController::class, 'profile']);
        Route::post('/profile-photo', [AdminUserController::class, 'storePhoto']);
        Route::delete('/profile-photo', [AdminUserController::class, 'destroyPhoto']);
        Route::get('/administrators', [AdminAccountController::class, 'index']);
        Route::get('/appointments', [MonitoringController::class, 'appointments']);
        Route::get('/reviews', [MonitoringController::class, 'reviews']);
        Route::get('/providers', [DoctorVerificationController::class, 'index']);
        Route::patch('/providers/{doctor}/verification', [DoctorVerificationController::class, 'update'])->whereNumber('doctor');
        Route::get('/verifications', [ProviderVerificationReviewController::class, 'index']);
        Route::get('/verifications/{verification}', [ProviderVerificationReviewController::class, 'show'])->whereNumber('verification');
        Route::post('/verifications/{verification}/approve', [ProviderVerificationReviewController::class, 'approve'])->whereNumber('verification');
        Route::post('/verifications/{verification}/request-changes', [ProviderVerificationReviewController::class, 'requestChanges'])->whereNumber('verification');
        Route::get('/verifications/{verification}/documents/{document}', [ProviderVerificationReviewController::class, 'download'])->whereNumber('verification')->whereNumber('document');
        Route::patch('/verifications/{verification}/documents/{document}', [ProviderVerificationReviewController::class, 'reviewDocument'])->whereNumber('verification')->whereNumber('document');
        Route::get('/inquiries', [CustomerInquiryController::class, 'index']);
        Route::get('/inquiries/{inquiry}', [CustomerInquiryController::class, 'show'])->whereNumber('inquiry');
        Route::patch('/inquiries/{inquiry}', [CustomerInquiryController::class, 'update'])->whereNumber('inquiry');
        Route::post('/inquiries/{inquiry}/replies', [CustomerInquiryController::class, 'reply'])->whereNumber('inquiry');
        Route::get('/catalog-requests', [CatalogRequestReviewController::class, 'index']);
        Route::get('/catalog-requests/matches', [CatalogRequestReviewController::class, 'matches']);
        Route::patch('/catalog-requests/{catalogRequest}', [CatalogRequestReviewController::class, 'update'])->whereNumber('catalogRequest');
        Route::get('/locations', [LocationController::class, 'index']);
        Route::patch('/locations/{location}', [LocationController::class, 'update'])->whereNumber('location');
        Route::middleware('role:super_admin')->group(function (): void {
            Route::post('/administrators', [AdminAccountController::class, 'store']);
            Route::patch('/administrators/{admin}', [AdminAccountController::class, 'update'])->whereNumber('admin');
        });
    });
