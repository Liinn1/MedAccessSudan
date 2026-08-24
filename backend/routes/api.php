<?php

use App\Http\Controllers\Api\V1\Admin\CityProposalController;
use App\Http\Controllers\Api\V1\Admin\DoctorVerificationController;
use App\Http\Controllers\Api\V1\Admin\LocationController;
use App\Http\Controllers\Api\V1\Auth\CurrentUserController;
use App\Http\Controllers\Api\V1\Auth\DoctorRegistrationOptionsController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\RegisterDoctorController;
use App\Http\Controllers\Api\V1\Auth\RegisterPatientController;
use App\Http\Controllers\Api\V1\Doctor\AppointmentController as DoctorAppointmentController;
use App\Http\Controllers\Api\V1\Doctor\AvailabilityExceptionController;
use App\Http\Controllers\Api\V1\Doctor\DoctorDashboardController;
use App\Http\Controllers\Api\V1\Doctor\ProfilePhotoController as DoctorProfilePhotoController;
use App\Http\Controllers\Api\V1\Doctor\ScheduleController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Patient\AppointmentController as PatientAppointmentController;
use App\Http\Controllers\Api\V1\Patient\DoctorAvailabilityController;
use App\Http\Controllers\Api\V1\Patient\DoctorFilterController;
use App\Http\Controllers\Api\V1\Patient\DoctorProfileController;
use App\Http\Controllers\Api\V1\Patient\DoctorSearchController;
use App\Http\Controllers\Api\V1\Patient\PatientHomeController;
use App\Http\Controllers\Api\V1\Patient\ProfilePhotoController as PatientProfilePhotoController;
use Illuminate\Support\Facades\Route;

Route::get('/v1/health', HealthController::class);

Route::prefix('v1/auth')->group(function () {
    Route::post('/login', LoginController::class);
    Route::post('/register', RegisterPatientController::class)->middleware('throttle:5,1');
    Route::get('/doctor-registration-options', DoctorRegistrationOptionsController::class);
    Route::post('/register/doctor', RegisterDoctorController::class)->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', CurrentUserController::class);
        Route::post('/logout', LogoutController::class);
    });
});

Route::middleware(['auth:sanctum', 'role:patient'])
    ->prefix('v1/patient')
    ->group(function (): void {
        Route::get('/home', PatientHomeController::class);
        Route::get('/doctor-filters', DoctorFilterController::class);
        Route::get('/doctors', DoctorSearchController::class);
        Route::get('/doctors/{doctor}', DoctorProfileController::class)->whereNumber('doctor');
        Route::get('/doctors/{doctor}/availability', DoctorAvailabilityController::class)->whereNumber('doctor');
        Route::get('/appointments', [PatientAppointmentController::class, 'index']);
        Route::post('/appointments', [PatientAppointmentController::class, 'store']);
        Route::post('/profile-photo', [PatientProfilePhotoController::class, 'store']);
        Route::delete('/profile-photo', [PatientProfilePhotoController::class, 'destroy']);
    });

Route::middleware(['auth:sanctum', 'role:doctor'])
    ->prefix('v1/doctor')
    ->group(function (): void {
        Route::get('/dashboard', DoctorDashboardController::class);
        Route::get('/schedule', [ScheduleController::class, 'index']);
        Route::put('/schedule', [ScheduleController::class, 'replace']);
        Route::post('/schedule/exceptions', [AvailabilityExceptionController::class, 'store']);
        Route::put('/schedule/exceptions/{exception}', [AvailabilityExceptionController::class, 'update'])->whereNumber('exception');
        Route::delete('/schedule/exceptions/{exception}', [AvailabilityExceptionController::class, 'destroy'])->whereNumber('exception');
        Route::get('/appointments', DoctorAppointmentController::class);
        Route::post('/profile-photo', [DoctorProfilePhotoController::class, 'store']);
    });

Route::middleware(['auth:sanctum', 'role:administrator'])
    ->prefix('v1/admin')
    ->group(function (): void {
        Route::get('/providers', [DoctorVerificationController::class, 'index']);
        Route::patch('/providers/{doctor}/verification', [DoctorVerificationController::class, 'update'])->whereNumber('doctor');
        Route::get('/city-proposals', [CityProposalController::class, 'index']);
        Route::patch('/city-proposals/{proposal}', [CityProposalController::class, 'update'])->whereNumber('proposal');
        Route::get('/locations', [LocationController::class, 'index']);
        Route::patch('/locations/{location}', [LocationController::class, 'update'])->whereNumber('location');
    });
