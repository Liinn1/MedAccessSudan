<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var list<array{code:string,name_en:string,name_ar:string}> */
    private array $states = [
        ['code' => 'SD-GZ', 'name_en' => 'Gezira', 'name_ar' => 'الجزيرة'],
        ['code' => 'SD-GD', 'name_en' => 'Gedaref', 'name_ar' => 'القضارف'],
        ['code' => 'SD-NB', 'name_en' => 'Blue Nile', 'name_ar' => 'النيل الأزرق'],
        ['code' => 'SD-DC', 'name_en' => 'Central Darfur', 'name_ar' => 'وسط دارفور'],
        ['code' => 'SD-DE', 'name_en' => 'East Darfur', 'name_ar' => 'شرق دارفور'],
        ['code' => 'SD-KA', 'name_en' => 'Kassala', 'name_ar' => 'كسلا'],
        ['code' => 'SD-KH', 'name_en' => 'Khartoum', 'name_ar' => 'الخرطوم'],
        ['code' => 'SD-DN', 'name_en' => 'North Darfur', 'name_ar' => 'شمال دارفور'],
        ['code' => 'SD-KN', 'name_en' => 'North Kordofan', 'name_ar' => 'شمال كردفان'],
        ['code' => 'SD-NO', 'name_en' => 'Northern', 'name_ar' => 'الشمالية'],
        ['code' => 'SD-RS', 'name_en' => 'Red Sea', 'name_ar' => 'البحر الأحمر'],
        ['code' => 'SD-NR', 'name_en' => 'River Nile', 'name_ar' => 'نهر النيل'],
        ['code' => 'SD-SI', 'name_en' => 'Sennar', 'name_ar' => 'سنار'],
        ['code' => 'SD-DS', 'name_en' => 'South Darfur', 'name_ar' => 'جنوب دارفور'],
        ['code' => 'SD-KS', 'name_en' => 'South Kordofan', 'name_ar' => 'جنوب كردفان'],
        ['code' => 'SD-DW', 'name_en' => 'West Darfur', 'name_ar' => 'غرب دارفور'],
        ['code' => 'SD-GK', 'name_en' => 'West Kordofan', 'name_ar' => 'غرب كردفان'],
        ['code' => 'SD-NW', 'name_en' => 'White Nile', 'name_ar' => 'النيل الأبيض'],
    ];

    public function up(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table): void {
            $table->string('address', 255)->nullable()->after('clinic_name');
        });

        $khartoum = DB::table('locations')->where('code', 'khartoum')->first();
        $sennar = DB::table('locations')->where('code', 'sennar')->first();

        if ($khartoum) {
            foreach (['omdurman' => 'Omdurman', 'bahri' => 'Bahri'] as $legacyCode => $address) {
                $legacy = DB::table('locations')->where('code', $legacyCode)->first();
                if (! $legacy) continue;
                DB::table('doctor_profiles')->where('location_id', $legacy->id)->whereNull('address')->update(['address' => $address]);
                $this->remapLocation((int) $legacy->id, (int) $khartoum->id);
                DB::table('locations')->where('id', $legacy->id)->delete();
            }
            DB::table('doctor_profiles')->where('location_id', $khartoum->id)->whereNull('address')->update(['address' => 'Khartoum']);
            $this->writeState((int) $khartoum->id, $this->state('SD-KH'));
        }

        if ($sennar) {
            DB::table('doctor_profiles')->where('location_id', $sennar->id)->whereNull('address')->update(['address' => 'Sennar']);
            $this->writeState((int) $sennar->id, $this->state('SD-SI'));
        }

        foreach ($this->states as $state) {
            DB::table('locations')->updateOrInsert(
                ['code' => $state['code']],
                [...$state, 'normalized_name' => mb_strtolower($state['name_en']), 'normalized_name_ar' => $state['name_ar'], 'is_active' => true, 'updated_at' => now(), 'created_at' => now()],
            );
        }

        if (Schema::hasTable('city_proposals')) Schema::drop('city_proposals');
        if (Schema::hasColumn('laboratory_profiles', 'proposed_city')) {
            Schema::table('laboratory_profiles', fn (Blueprint $table) => $table->dropColumn('proposed_city'));
        }
    }

    public function down(): void
    {
        Schema::table('laboratory_profiles', fn (Blueprint $table) => $table->string('proposed_city', 150)->nullable());
        Schema::table('doctor_profiles', fn (Blueprint $table) => $table->dropColumn('address'));
    }

    private function remapLocation(int $from, int $to): void
    {
        foreach ([
            ['doctor_profiles', 'location_id'], ['doctor_profiles', 'home_visit_location_id'],
            ['laboratory_profiles', 'location_id'], ['home_visit_details', 'location_id'],
            ['laboratory_orders', 'collection_location_id'],
        ] as [$table, $column]) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, $column)) {
                DB::table($table)->where($column, $from)->update([$column => $to]);
            }
        }
    }

    /** @return array{code:string,name_en:string,name_ar:string} */
    private function state(string $code): array
    {
        return collect($this->states)->firstWhere('code', $code);
    }

    /** @param array{code:string,name_en:string,name_ar:string} $state */
    private function writeState(int $id, array $state): void
    {
        DB::table('locations')->where('id', $id)->update([
            ...$state,
            'normalized_name' => mb_strtolower($state['name_en']),
            'normalized_name_ar' => $state['name_ar'],
            'is_active' => true,
            'updated_at' => now(),
        ]);
    }
};
