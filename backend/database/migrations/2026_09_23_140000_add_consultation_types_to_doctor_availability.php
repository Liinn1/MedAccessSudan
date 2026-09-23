<?php

use App\Enums\AppointmentServiceType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table): void {
            $table->boolean('offers_clinic_visits')->default(true)->after('clinic_name');
            $table->boolean('offers_home_visits')->default(false)->after('offers_clinic_visits');
        });

        Schema::table('doctor_availability_schedules', function (Blueprint $table): void {
            $table->string('consultation_type', 20)->default(AppointmentServiceType::Clinic->value)->after('doctor_profile_id');
        });

        Schema::table('doctor_availability_exceptions', function (Blueprint $table): void {
            $table->string('consultation_type', 20)->default(AppointmentServiceType::Clinic->value)->after('doctor_profile_id');
        });

        Schema::table('doctor_availability_schedules', function (Blueprint $table): void {
            $table->dropUnique('doctor_schedule_start_unique');
            $table->unique(
                ['doctor_profile_id', 'consultation_type', 'day_of_week', 'start_time'],
                'doctor_schedule_start_unique'
            );
        });

        // Existing doctors and weekly hours remain clinic-visit services.
        DB::table('doctor_profiles')->update([
            'offers_clinic_visits' => true,
            'offers_home_visits' => false,
        ]);
        DB::table('doctor_availability_schedules')->update([
            'consultation_type' => AppointmentServiceType::Clinic->value,
        ]);
        DB::table('doctor_availability_exceptions')->update([
            'consultation_type' => AppointmentServiceType::Clinic->value,
        ]);
    }

    public function down(): void
    {
        Schema::table('doctor_availability_schedules', function (Blueprint $table): void {
            $table->dropUnique('doctor_schedule_start_unique');
            $table->unique(['doctor_profile_id', 'day_of_week', 'start_time'], 'doctor_schedule_start_unique');
            $table->dropColumn('consultation_type');
        });

        Schema::table('doctor_availability_exceptions', function (Blueprint $table): void {
            $table->dropColumn('consultation_type');
        });

        Schema::table('doctor_profiles', function (Blueprint $table): void {
            $table->dropColumn(['offers_clinic_visits', 'offers_home_visits']);
        });
    }
};
