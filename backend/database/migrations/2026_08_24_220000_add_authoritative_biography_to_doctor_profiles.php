<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table): void {
            $table->text('biography')->nullable()->after('clinic_name');
            $table->string('biography_language', 2)->nullable()->after('biography');
        });

        DB::table('doctor_profiles')->whereNotNull('bio_en')->update([
            'biography' => DB::raw('bio_en'),
            'biography_language' => 'en',
        ]);
        DB::table('doctor_profiles')->whereNull('biography')->whereNotNull('bio_ar')->update([
            'biography' => DB::raw('bio_ar'),
            'biography_language' => 'ar',
        ]);
    }

    public function down(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table): void {
            $table->dropColumn(['biography', 'biography_language']);
        });
    }
};
