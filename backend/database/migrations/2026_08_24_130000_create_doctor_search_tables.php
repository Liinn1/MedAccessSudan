<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('specializations', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 60)->unique();
            $table->string('name_en', 100);
            $table->string('name_ar', 100);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('locations', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 60)->unique();
            $table->string('name_en', 100);
            $table->string('name_ar', 100);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('doctor_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('specialization_id')->constrained()->restrictOnDelete();
            $table->foreignId('location_id')->constrained()->restrictOnDelete();
            $table->string('clinic_name')->nullable();
            $table->string('verification_status', 20)->default('pending')->index();
            $table->timestamps();
        });

        Schema::create('doctor_availability', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_profile_id')->constrained()->cascadeOnDelete();
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->string('status', 20)->default('available')->index();
            $table->timestamps();
            $table->unique(['doctor_profile_id', 'starts_at']);
        });

        $now = now();
        DB::table('specializations')->insert([
            ['code' => 'general_medicine', 'name_en' => 'General Medicine', 'name_ar' => 'الطب العام'],
            ['code' => 'internal_medicine', 'name_en' => 'Internal Medicine', 'name_ar' => 'الطب الباطني'],
            ['code' => 'pediatrics', 'name_en' => 'Pediatrics', 'name_ar' => 'طب الأطفال'],
            ['code' => 'cardiology', 'name_en' => 'Cardiology', 'name_ar' => 'أمراض القلب'],
            ['code' => 'obstetrics_gynecology', 'name_en' => 'Obstetrics & Gynecology', 'name_ar' => 'النساء والتوليد'],
            ['code' => 'general_surgery', 'name_en' => 'General Surgery', 'name_ar' => 'الجراحة العامة'],
            ['code' => 'orthopedics', 'name_en' => 'Orthopedics', 'name_ar' => 'جراحة العظام'],
            ['code' => 'dermatology', 'name_en' => 'Dermatology', 'name_ar' => 'الأمراض الجلدية'],
            ['code' => 'ophthalmology', 'name_en' => 'Ophthalmology', 'name_ar' => 'طب العيون'],
            ['code' => 'ent', 'name_en' => 'Ear, Nose & Throat (ENT)', 'name_ar' => 'الأنف والأذن والحنجرة'],
            ['code' => 'neurology', 'name_en' => 'Neurology', 'name_ar' => 'طب الأعصاب'],
            ['code' => 'psychiatry', 'name_en' => 'Psychiatry', 'name_ar' => 'الطب النفسي'],
            ['code' => 'urology', 'name_en' => 'Urology', 'name_ar' => 'المسالك البولية'],
            ['code' => 'endocrinology', 'name_en' => 'Endocrinology', 'name_ar' => 'الغدد الصماء'],
            ['code' => 'dentistry', 'name_en' => 'Dentistry', 'name_ar' => 'طب الأسنان'],
        ]);
        DB::table('specializations')->update(['created_at' => $now, 'updated_at' => $now]);
        DB::table('locations')->insert([
            ['code' => 'khartoum', 'name_en' => 'Khartoum', 'name_ar' => 'الخرطوم', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'omdurman', 'name_en' => 'Omdurman', 'name_ar' => 'أم درمان', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'bahri', 'name_en' => 'Bahri', 'name_ar' => 'بحري', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_availability');
        Schema::dropIfExists('doctor_profiles');
        Schema::dropIfExists('locations');
        Schema::dropIfExists('specializations');
    }
};
