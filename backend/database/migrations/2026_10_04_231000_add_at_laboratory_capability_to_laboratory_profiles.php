<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('laboratory_profiles', function (Blueprint $table): void {
            // At-laboratory service was the implicit legacy behavior.
            $table->boolean('supports_at_lab')->default(true)->after('supports_home_collection');
        });
    }

    public function down(): void
    {
        Schema::table('laboratory_profiles', function (Blueprint $table): void {
            $table->dropColumn('supports_at_lab');
        });
    }
};
