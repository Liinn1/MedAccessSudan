<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['doctor_profiles', 'laboratory_profiles'] as $table) {
            DB::table($table)->where('verification_status', 'pending')->update(['verification_status' => 'pending_documents']);
            DB::table($table)->where('verification_status', 'rejected')->update(['verification_status' => 'action_required']);
        }

        Schema::create('provider_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('verifiable_type');
            $table->unsignedBigInteger('verifiable_id');
            $table->index(['verifiable_type', 'verifiable_id']);
            $table->string('status', 32);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('admin_note')->nullable();
            $table->timestamps();
            $table->unique(['verifiable_type', 'verifiable_id']);
        });

        Schema::create('verification_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_verification_id')->constrained('provider_verifications')->cascadeOnDelete();
            $table->string('document_type', 60);
            $table->string('original_filename', 240);
            $table->string('disk', 32)->default('local');
            $table->string('path', 500);
            $table->string('mime_type', 80);
            $table->unsignedInteger('size_bytes');
            $table->string('status', 20)->default('pending');
            $table->text('admin_note')->nullable();
            $table->timestamp('uploaded_at');
            $table->timestamps();
            $table->index(['provider_verification_id', 'document_type'], 'verification_docs_type_idx');
        });

        $this->backfill('App\\Models\\DoctorProfile', 'doctor_profiles');
        $this->backfill('App\\Models\\LaboratoryProfile', 'laboratory_profiles');
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_documents');
        Schema::dropIfExists('provider_verifications');

        foreach (['doctor_profiles', 'laboratory_profiles'] as $table) {
            DB::table($table)->where('verification_status', 'pending_documents')->update(['verification_status' => 'pending']);
            DB::table($table)->where('verification_status', 'action_required')->update(['verification_status' => 'rejected']);
            DB::table($table)->where('verification_status', 'under_review')->update(['verification_status' => 'pending']);
        }
    }

    private function backfill(string $class, string $table): void
    {
        $alias = $class === 'App\\Models\\DoctorProfile' ? 'doctor_profile' : 'laboratory_profile';
        $now = now();

        DB::table($table)->orderBy('id')->chunkById(100, function ($rows) use ($alias, $now) {
            foreach ($rows as $row) {
                DB::table('provider_verifications')->insert([
                    'verifiable_type' => $alias,
                    'verifiable_id' => $row->id,
                    'status' => $row->verification_status,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        });
    }
};
