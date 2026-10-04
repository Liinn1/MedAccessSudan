<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('doctor_reviews', 'provider_reviews');

        Schema::table('provider_reviews', function (Blueprint $table): void {
            $table->unsignedBigInteger('appointment_id')->nullable()->change();
            $table->unsignedBigInteger('doctor_profile_id')->nullable()->change();
            $table->foreignId('laboratory_order_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->foreignId('laboratory_profile_id')->nullable()->constrained()->restrictOnDelete();
            $table->index(['laboratory_profile_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('provider_reviews', function (Blueprint $table): void {
            $table->dropIndex(['laboratory_profile_id', 'created_at']);
            $table->dropConstrainedForeignId('laboratory_profile_id');
            $table->dropUnique(['laboratory_order_id']);
            $table->dropConstrainedForeignId('laboratory_order_id');
        });

        Schema::rename('provider_reviews', 'doctor_reviews');
    }
};
