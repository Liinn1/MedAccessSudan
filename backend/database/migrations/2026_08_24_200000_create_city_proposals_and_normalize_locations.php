<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table): void {
            $table->string('normalized_name', 150)->nullable()->after('name_ar');
        });

        DB::table('locations')->orderBy('id')->each(function (object $location): void {
            $normalized = mb_strtolower(preg_replace('/\s+/u', ' ', trim($location->name_en)), 'UTF-8');
            DB::table('locations')->where('id', $location->id)->update(['normalized_name' => $normalized]);
        });

        Schema::table('locations', function (Blueprint $table): void {
            $table->unique('normalized_name');
        });

        Schema::table('doctor_profiles', function (Blueprint $table): void {
            $table->foreignId('location_id')->nullable()->change();
        });

        Schema::create('city_proposals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_profile_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('proposed_name', 150);
            $table->string('normalized_name', 150)->index();
            $table->string('status', 20)->default('pending')->index();
            $table->foreignId('resolved_location_id')->nullable()->constrained('locations')->restrictOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('city_proposals');

        Schema::table('locations', function (Blueprint $table): void {
            $table->dropUnique(['normalized_name']);
            $table->dropColumn('normalized_name');
        });
    }
};
