<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_test_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 80)->unique();
            $table->string('name_en', 120);
            $table->string('name_ar', 120);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('lab_tests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lab_test_category_id')->constrained('lab_test_categories')->restrictOnDelete();
            $table->string('slug', 80)->unique();
            $table->string('name_en', 160);
            $table->string('name_ar', 160);
            $table->string('short_name', 40)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('laboratory_offerings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('laboratory_profile_id')->constrained('laboratory_profiles')->cascadeOnDelete();
            $table->foreignId('lab_test_id')->constrained('lab_tests')->restrictOnDelete();
            $table->decimal('price', 10, 2);
            $table->char('currency', 3);
            $table->unsignedSmallInteger('estimated_turnaround_hours');
            $table->boolean('is_available')->default(true);
            $table->timestamps();
            $table->unique(['laboratory_profile_id', 'lab_test_id']);
        });

        Schema::create('laboratory_catalog_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('laboratory_profile_id')->constrained('laboratory_profiles')->cascadeOnDelete();
            $table->foreignId('requested_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('suggested_name', 160);
            $table->unsignedBigInteger('suggested_lab_test_category_id')->nullable();
            $table->foreign('suggested_lab_test_category_id', 'lab_catalog_req_category_fk')
                ->references('id')
                ->on('lab_test_categories')
                ->nullOnDelete();
            $table->string('note', 500)->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->timestamps();
        });

        Schema::create('laboratory_orders', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 32)->unique();
            $table->foreignId('patient_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('laboratory_profile_id')->constrained('laboratory_profiles')->restrictOnDelete();
            $table->string('laboratory_name_snapshot', 150);
            $table->string('status', 30)->index();
            $table->timestamp('requested_at');
            $table->timestamps();
        });

        Schema::create('laboratory_order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('laboratory_order_id')->constrained('laboratory_orders')->cascadeOnDelete();
            $table->foreignId('lab_test_id')->constrained('lab_tests')->restrictOnDelete();
            $table->foreignId('laboratory_offering_id')->nullable()->constrained('laboratory_offerings')->nullOnDelete();
            $table->string('name_en', 160);
            $table->string('name_ar', 160);
            $table->string('short_name', 40)->nullable();
            $table->decimal('price', 10, 2);
            $table->char('currency', 3);
            $table->unsignedSmallInteger('estimated_turnaround_hours');
            $table->timestamps();
        });

        Schema::create('laboratory_order_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('laboratory_order_id')->constrained('laboratory_orders')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->timestamps();
        });

        Schema::create('laboratory_results', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('laboratory_order_id')->constrained('laboratory_orders')->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('disk', 32);
            $table->string('path');
            $table->string('original_filename', 255);
            $table->string('mime_type', 80);
            $table->unsignedInteger('size_bytes');
            $table->timestamps();
        });

        Schema::create('laboratory_activity_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('laboratory_profile_id')->constrained('laboratory_profiles')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 80);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laboratory_activity_logs');
        Schema::dropIfExists('laboratory_results');
        Schema::dropIfExists('laboratory_order_events');
        Schema::dropIfExists('laboratory_order_items');
        Schema::dropIfExists('laboratory_orders');
        Schema::dropIfExists('laboratory_catalog_requests');
        Schema::dropIfExists('laboratory_offerings');
        Schema::dropIfExists('lab_tests');
        Schema::dropIfExists('lab_test_categories');
    }
};
