<?php

use App\Services\CityNameNormalizer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table): void {
            $table->string('normalized_name_ar', 150)->nullable()->after('normalized_name');
        });

        DB::table('locations')->where('id', 4)->where('code', 'sennar')->update([
            'name_ar' => "\u{0633}\u{0646}\u{0627}\u{0631}",
            'updated_at' => now(),
        ]);

        $normalizer = app(CityNameNormalizer::class);
        DB::table('locations')->orderBy('id')->each(function (object $location) use ($normalizer): void {
            DB::table('locations')->where('id', $location->id)->update([
                'normalized_name_ar' => $normalizer->comparison((string) $location->name_ar),
            ]);
        });

        $duplicates = DB::table('locations')->select('normalized_name_ar')
            ->whereNotNull('normalized_name_ar')->groupBy('normalized_name_ar')
            ->havingRaw('COUNT(*) > 1')->exists();

        if ($duplicates) {
            throw new \RuntimeException('Duplicate normalized Arabic city names must be resolved before this migration can continue.');
        }

        Schema::table('locations', function (Blueprint $table): void {
            $table->unique('normalized_name_ar');
        });

        Schema::table('city_proposals', function (Blueprint $table): void {
            $table->foreignId('doctor_profile_id')->nullable()->change();
            $table->foreignId('laboratory_profile_id')->nullable()->unique()->after('doctor_profile_id')->constrained()->cascadeOnDelete();
        });

        DB::table('laboratory_profiles')->whereNull('location_id')->whereNotNull('proposed_city')
            ->orderBy('id')->each(function (object $profile) use ($normalizer): void {
                $display = $normalizer->display((string) $profile->proposed_city);
                if ($display === '') return;
                DB::table('city_proposals')->insertOrIgnore([
                    'doctor_profile_id' => null,
                    'laboratory_profile_id' => $profile->id,
                    'proposed_name' => $display,
                    'normalized_name' => $normalizer->comparison($display),
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        DB::table('city_proposals')->whereNotNull('laboratory_profile_id')->delete();
        Schema::table('city_proposals', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('laboratory_profile_id');
            $table->foreignId('doctor_profile_id')->nullable(false)->change();
        });
        Schema::table('locations', function (Blueprint $table): void {
            $table->dropUnique(['normalized_name_ar']);
            $table->dropColumn('normalized_name_ar');
        });
    }
};
