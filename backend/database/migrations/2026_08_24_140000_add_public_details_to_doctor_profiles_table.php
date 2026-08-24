<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table): void {
            $table->text('bio_en')->nullable()->after('clinic_name');
            $table->text('bio_ar')->nullable()->after('bio_en');
            $table->string('profile_image_path')->nullable()->after('bio_ar');
        });
    }

    public function down(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table): void {
            $table->dropColumn(['bio_en', 'bio_ar', 'profile_image_path']);
        });
    }
};
