<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_tests', function (Blueprint $table): void {
            $table->string('specimen_type', 30)->nullable();
            $table->text('search_aliases')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('lab_tests', function (Blueprint $table): void {
            $table->dropColumn(['specimen_type', 'search_aliases']);
        });
    }
};
