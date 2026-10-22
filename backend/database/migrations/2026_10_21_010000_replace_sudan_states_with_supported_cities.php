<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Supported MedAccess cities/localities. Codes are stable application identifiers;
     * names follow Sudan COD/locality and commonly used city naming.
     *
     * @var list<array{code:string,name_en:string,name_ar:string,state_code:string}>
     */
    private array $cities = [
        ['code' => 'SD-KH', 'name_en' => 'Khartoum', 'name_ar' => 'الخرطوم', 'state_code' => 'SD-KH'],
        ['code' => 'city-omdurman', 'name_en' => 'Omdurman', 'name_ar' => 'أم درمان', 'state_code' => 'SD-KH'],
        ['code' => 'city-bahri', 'name_en' => 'Khartoum North / Bahri', 'name_ar' => 'بحري', 'state_code' => 'SD-KH'],
        ['code' => 'SD-GZ', 'name_en' => 'Wad Medani', 'name_ar' => 'ود مدني', 'state_code' => 'SD-GZ'],
        ['code' => 'SD-GD', 'name_en' => 'Gedaref', 'name_ar' => 'القضارف', 'state_code' => 'SD-GD'],
        ['code' => 'SD-NB', 'name_en' => 'Damazin', 'name_ar' => 'الدمازين', 'state_code' => 'SD-NB'],
        ['code' => 'SD-DC', 'name_en' => 'Zalingei', 'name_ar' => 'زالنجي', 'state_code' => 'SD-DC'],
        ['code' => 'SD-DE', 'name_en' => 'Ed Daein', 'name_ar' => 'الضعين', 'state_code' => 'SD-DE'],
        ['code' => 'SD-KA', 'name_en' => 'Kassala', 'name_ar' => 'كسلا', 'state_code' => 'SD-KA'],
        ['code' => 'SD-DN', 'name_en' => 'El Fasher', 'name_ar' => 'الفاشر', 'state_code' => 'SD-DN'],
        ['code' => 'SD-KN', 'name_en' => 'El Obeid', 'name_ar' => 'الأبيض', 'state_code' => 'SD-KN'],
        ['code' => 'SD-NO', 'name_en' => 'Dongola', 'name_ar' => 'دنقلا', 'state_code' => 'SD-NO'],
        ['code' => 'SD-RS', 'name_en' => 'Port Sudan', 'name_ar' => 'بورتسودان', 'state_code' => 'SD-RS'],
        ['code' => 'SD-NR', 'name_en' => 'Atbara', 'name_ar' => 'عطبرة', 'state_code' => 'SD-NR'],
        ['code' => 'SD-SI', 'name_en' => 'Sennar', 'name_ar' => 'سنار', 'state_code' => 'SD-SI'],
        ['code' => 'SD-DS', 'name_en' => 'Nyala', 'name_ar' => 'نيالا', 'state_code' => 'SD-DS'],
        ['code' => 'SD-KS', 'name_en' => 'Kadugli', 'name_ar' => 'كادقلي', 'state_code' => 'SD-KS'],
        ['code' => 'SD-DW', 'name_en' => 'El Geneina', 'name_ar' => 'الجنينة', 'state_code' => 'SD-DW'],
        ['code' => 'SD-GK', 'name_en' => 'El Fula', 'name_ar' => 'الفولة', 'state_code' => 'SD-GK'],
        ['code' => 'SD-NW', 'name_en' => 'Kosti', 'name_ar' => 'كوستي', 'state_code' => 'SD-NW'],
        ['code' => 'city-rabak', 'name_en' => 'Rabak', 'name_ar' => 'ربك', 'state_code' => 'SD-NW'],
        ['code' => 'city-shendi', 'name_en' => 'Shendi', 'name_ar' => 'شندي', 'state_code' => 'SD-NR'],
        ['code' => 'city-sawakin', 'name_en' => 'Sawakin', 'name_ar' => 'سواكن', 'state_code' => 'SD-RS'],
        ['code' => 'city-sinja', 'name_en' => 'Sinja', 'name_ar' => 'سنجة', 'state_code' => 'SD-SI'],
        ['code' => 'city-ed-dueim', 'name_en' => 'Ed Dueim', 'name_ar' => 'الدويم', 'state_code' => 'SD-NW'],
        ['code' => 'city-el-managil', 'name_en' => 'El Managil', 'name_ar' => 'المناقل', 'state_code' => 'SD-GZ'],
    ];

    public function up(): void
    {
        $defaultByState = collect($this->cities)->unique('state_code')->keyBy('state_code');

        foreach ($defaultByState as $stateCode => $city) {
            $state = DB::table('locations')->where('code', $stateCode)->first();
            if (! $state) continue;

            $this->writeCity((int) $state->id, $city);
        }

        foreach ($this->cities as $city) {
            DB::table('locations')->updateOrInsert(
                ['code' => $city['code']],
                $this->payload($city),
            );
        }

        $omdurmanId = DB::table('locations')->where('code', 'city-omdurman')->value('id');
        $bahriId = DB::table('locations')->where('code', 'city-bahri')->value('id');

        if ($omdurmanId) {
            DB::table('doctor_profiles')->whereRaw('LOWER(address) LIKE ?', ['%omdurman%'])->update(['location_id' => $omdurmanId]);
            DB::table('laboratory_profiles')->whereRaw('LOWER(address) LIKE ?', ['%omdurman%'])->update(['location_id' => $omdurmanId]);
        }
        if ($bahriId) {
            DB::table('doctor_profiles')->whereRaw('LOWER(address) LIKE ?', ['%bahri%'])->update(['location_id' => $bahriId]);
            DB::table('laboratory_profiles')->whereRaw('LOWER(address) LIKE ?', ['%bahri%'])->update(['location_id' => $bahriId]);
        }
    }

    public function down(): void
    {
        // Restoring state semantics after provider records have selected cities would
        // be ambiguous. Keep the canonical city records rather than guessing.
    }

    /** @param array{code:string,name_en:string,name_ar:string,state_code:string} $city */
    private function writeCity(int $id, array $city): void
    {
        DB::table('locations')->where('id', $id)->update($this->payload($city));
    }

    /** @param array{code:string,name_en:string,name_ar:string,state_code:string} $city */
    private function payload(array $city): array
    {
        return [
            'code' => $city['code'],
            'name_en' => $city['name_en'],
            'name_ar' => $city['name_ar'],
            'normalized_name' => mb_strtolower($city['name_en']),
            'normalized_name_ar' => $city['name_ar'],
            'is_active' => true,
            'updated_at' => now(),
            'created_at' => now(),
        ];
    }
};
