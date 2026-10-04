<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('laboratory_profiles', function (Blueprint $table): void {
            $table->boolean('supports_home_collection')->default(false);
        });

        Schema::table('laboratory_orders', function (Blueprint $table): void {
            $table->string('collection_method', 30)->default('at_lab');
            $table->timestamp('collection_starts_at')->nullable();
            $table->foreignId('collection_location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->string('collection_area', 255)->nullable();
            $table->string('collection_address', 500)->nullable();
            $table->string('collection_notes', 2000)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('laboratory_orders', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('collection_location_id');
            $table->dropColumn([
                'collection_method',
                'collection_starts_at',
                'collection_area',
                'collection_address',
                'collection_notes',
            ]);
        });

        Schema::table('laboratory_profiles', function (Blueprint $table): void {
            $table->dropColumn('supports_home_collection');
        });
    }
};
