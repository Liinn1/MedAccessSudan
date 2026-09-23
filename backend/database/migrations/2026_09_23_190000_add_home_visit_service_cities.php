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
            $table->foreignId('home_visit_location_id')->nullable()->after('location_id')->constrained('locations')->restrictOnDelete();
        });
        Schema::table('home_visit_details', function (Blueprint $table): void {
            $table->foreignId('location_id')->nullable()->after('appointment_id')->constrained('locations')->restrictOnDelete();
        });

        DB::table('doctor_profiles')->where('offers_home_visits', true)->update([
            'home_visit_location_id' => DB::raw('location_id'),
        ]);
    }

    public function down(): void
    {
        Schema::table('home_visit_details', fn (Blueprint $table) => $table->dropConstrainedForeignId('location_id'));
        Schema::table('doctor_profiles', fn (Blueprint $table) => $table->dropConstrainedForeignId('home_visit_location_id'));
    }
};
