<?php

use App\Http\Controllers\Api\V1\Auth\CurrentUserController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\RegisterPatientController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Patient\DoctorFilterController;
use App\Http\Controllers\Api\V1\Patient\DoctorSearchController;
use App\Http\Controllers\Api\V1\Patient\PatientHomeController;
use Illuminate\Support\Facades\Route;

Route::get('/v1/health', HealthController::class);

Route::prefix('v1/auth')->group(function () {
    Route::post('/login', LoginController::class);
    Route::post('/register', RegisterPatientController::class)->middleware('throttle:5,1');

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
    });
