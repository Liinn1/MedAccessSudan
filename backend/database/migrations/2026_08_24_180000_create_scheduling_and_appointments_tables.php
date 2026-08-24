<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_availability_schedules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('slot_duration_minutes');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['doctor_profile_id', 'day_of_week', 'is_active'], 'doctor_schedule_lookup');
            $table->unique(['doctor_profile_id', 'day_of_week', 'start_time'], 'doctor_schedule_start_unique');
        });

        Schema::create('doctor_availability_exceptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->date('exception_date');
            $table->string('type', 20);
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->timestamps();
            $table->index(['doctor_profile_id', 'exception_date'], 'doctor_exception_lookup');
        });

        Schema::create('appointments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('doctor_profile_id')->constrained()->restrictOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('status', 20)->default('confirmed')->index();
            $table->string('service_type', 20)->default('clinic');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['doctor_profile_id', 'starts_at'], 'doctor_appointment_start_unique');
            $table->index(['patient_id', 'starts_at'], 'patient_appointment_lookup');
            $table->index(['doctor_profile_id', 'starts_at'], 'doctor_appointment_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('doctor_availability_exceptions');
        Schema::dropIfExists('doctor_availability_schedules');
    }
};
