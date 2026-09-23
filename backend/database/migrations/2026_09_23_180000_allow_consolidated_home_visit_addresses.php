<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_visit_details', function (Blueprint $table): void {
            // Retained only for backwards compatibility with existing bookings.
            $table->string('street', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Existing consolidated records may legitimately have no legacy street value.
    }
};
