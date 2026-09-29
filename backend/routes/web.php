<?php

use App\Http\Controllers\Api\V1\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/email/verify/{id}/{hash}', VerifyEmailController::class)
    ->middleware('throttle:6,1')
    ->name('verification.verify');
