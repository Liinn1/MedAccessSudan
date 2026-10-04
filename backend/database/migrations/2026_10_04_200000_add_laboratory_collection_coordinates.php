<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('laboratory_orders', function (Blueprint $table): void {
            $table->decimal('collection_latitude', 10, 7)->nullable()->after('collection_notes');
            $table->decimal('collection_longitude', 10, 7)->nullable()->after('collection_latitude');
        });
    }

    public function down(): void
    {
        Schema::table('laboratory_orders', function (Blueprint $table): void {
            $table->dropColumn(['collection_latitude', 'collection_longitude']);
        });
    }
};
