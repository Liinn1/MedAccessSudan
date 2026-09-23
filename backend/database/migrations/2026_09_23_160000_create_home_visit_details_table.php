<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_visit_details', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('appointment_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('contact_phone', 30);
            $table->string('area', 150);
            $table->string('street', 255);
            $table->string('building', 150)->nullable();
            $table->string('floor', 50)->nullable();
            $table->string('apartment', 50)->nullable();
            $table->string('landmark', 255)->nullable();
            $table->text('directions')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_visit_details');
    }
};
