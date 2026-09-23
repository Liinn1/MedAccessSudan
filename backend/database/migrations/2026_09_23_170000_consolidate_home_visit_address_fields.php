<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_visit_details', function (Blueprint $table): void {
            $table->string('address_details', 500)->nullable()->after('area');
            $table->text('additional_directions')->nullable()->after('address_details');
        });
    }

    public function down(): void
    {
        Schema::table('home_visit_details', function (Blueprint $table): void {
            $table->dropColumn(['address_details', 'additional_directions']);
        });
    }
};
