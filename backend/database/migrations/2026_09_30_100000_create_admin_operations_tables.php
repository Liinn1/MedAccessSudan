<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_inquiries', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100);
            $table->string('email', 255);
            $table->string('subject', 150);
            $table->string('status', 20)->default('new')->index();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
        });

        Schema::create('customer_inquiry_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_inquiry_id')->constrained('customer_inquiries')->cascadeOnDelete();
            $table->string('author_type', 20);
            $table->foreignId('admin_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::table('laboratory_catalog_requests', function (Blueprint $table): void {
            $table->foreignId('reviewed_by_user_id')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by_user_id');
            $table->text('admin_note')->nullable()->after('reviewed_at');
            $table->foreignId('resolved_lab_test_id')->nullable()->after('admin_note')->constrained('lab_tests')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('laboratory_catalog_requests', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('resolved_lab_test_id');
            $table->dropConstrainedForeignId('reviewed_by_user_id');
            $table->dropColumn(['reviewed_at', 'admin_note']);
        });
        Schema::dropIfExists('customer_inquiry_messages');
        Schema::dropIfExists('customer_inquiries');
    }
};
