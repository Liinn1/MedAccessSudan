<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LabTestCatalogSeeder extends Seeder
{
    /**
     * Practical graduation-project catalog. Names are bilingual on one record
     * so English and Arabic never become separate tests.
     */
    public function run(): void
    {
        $now = now();
        $categories = [
            ['slug' => 'hematology', 'name_en' => 'Hematology', 'name_ar' => 'أمراض الدم', 'sort_order' => 1],
            ['slug' => 'clinical-chemistry', 'name_en' => 'Clinical Chemistry', 'name_ar' => 'الكيمياء السريرية', 'sort_order' => 2],
            ['slug' => 'lipid-profile', 'name_en' => 'Lipid Profile', 'name_ar' => 'صورة الدهون', 'sort_order' => 3],
            ['slug' => 'liver-function', 'name_en' => 'Liver Function', 'name_ar' => 'وظائف الكبد', 'sort_order' => 4],
            ['slug' => 'kidney-electrolytes', 'name_en' => 'Kidney Function & Electrolytes', 'name_ar' => 'وظائف الكلى والكهارل', 'sort_order' => 5],
            ['slug' => 'thyroid', 'name_en' => 'Thyroid', 'name_ar' => 'الغدة الدرقية', 'sort_order' => 6],
            ['slug' => 'coagulation', 'name_en' => 'Coagulation', 'name_ar' => 'التخثر', 'sort_order' => 7],
            ['slug' => 'infectious-disease', 'name_en' => 'Infectious Disease', 'name_ar' => 'الأمراض المعدية', 'sort_order' => 8],
            ['slug' => 'urine-stool', 'name_en' => 'Urine & Stool', 'name_ar' => 'البول والبراز', 'sort_order' => 9],
            ['slug' => 'pregnancy-hormones', 'name_en' => 'Pregnancy / Selected Hormones', 'name_ar' => 'الحمل / هرمونات مختارة', 'sort_order' => 10],
        ];

        foreach ($categories as $category) {
            DB::table('lab_test_categories')->updateOrInsert(
                ['slug' => $category['slug']],
                [...$category, 'updated_at' => $now, 'created_at' => $now],
            );
        }

        $categoryIds = DB::table('lab_test_categories')->pluck('id', 'slug');

        $tests = [
            ['hematology', 'cbc', 'Complete Blood Count (CBC)', 'صورة دم كاملة', 'CBC'],
            ['hematology', 'hemoglobin', 'Hemoglobin (Hb)', 'الهيموغلوبين', 'Hb'],
            ['hematology', 'esr', 'Erythrocyte Sedimentation Rate (ESR)', 'سرعة ترسيب الدم', 'ESR'],
            ['hematology', 'peripheral-blood-film', 'Peripheral Blood Film', 'فيلم دم محيطي', null],
            ['hematology', 'reticulocyte-count', 'Reticulocyte Count', 'عد الخلايا الشبكية', null],
            ['clinical-chemistry', 'fasting-blood-glucose', 'Fasting Blood Glucose', 'سكر الدم الصائم', 'FBG'],
            ['clinical-chemistry', 'random-blood-glucose', 'Random Blood Glucose', 'سكر الدم العشوائي', 'RBG'],
            ['clinical-chemistry', 'hba1c', 'HbA1c', 'السكر التراكمي', 'HbA1c'],
            ['clinical-chemistry', 'urea', 'Urea', 'اليوريا', null],
            ['clinical-chemistry', 'creatinine', 'Creatinine', 'الكرياتينين', null],
            ['clinical-chemistry', 'uric-acid', 'Uric Acid', 'حمض اليوريك', null],
            ['lipid-profile', 'total-cholesterol', 'Total Cholesterol', 'الكوليسترول الكلي', null],
            ['lipid-profile', 'hdl-cholesterol', 'HDL Cholesterol', 'كوليسترول عالي الكثافة', 'HDL'],
            ['lipid-profile', 'ldl-cholesterol', 'LDL Cholesterol', 'كوليسترول منخفض الكثافة', 'LDL'],
            ['lipid-profile', 'triglycerides', 'Triglycerides', 'الدهون الثلاثية', null],
            ['liver-function', 'alt', 'ALT', 'ناقلة أمين الألانين', 'ALT'],
            ['liver-function', 'ast', 'AST', 'ناقلة أمين الأسبارتات', 'AST'],
            ['liver-function', 'alp', 'ALP', 'الفوسفاتاز القلوي', 'ALP'],
            ['liver-function', 'total-bilirubin', 'Total Bilirubin', 'البيليروبين الكلي', null],
            ['liver-function', 'direct-bilirubin', 'Direct Bilirubin', 'البيليروبين المباشر', null],
            ['liver-function', 'albumin', 'Albumin', 'الألبومين', null],
            ['liver-function', 'total-protein', 'Total Protein', 'البروتين الكلي', null],
            ['kidney-electrolytes', 'sodium', 'Sodium', 'الصوديوم', 'Na'],
            ['kidney-electrolytes', 'potassium', 'Potassium', 'البوتاسيوم', 'K'],
            ['kidney-electrolytes', 'chloride', 'Chloride', 'الكلوريد', 'Cl'],
            ['thyroid', 'tsh', 'TSH', 'الهرمون المنبه للدرقية', 'TSH'],
            ['thyroid', 'free-t4', 'Free T4', 'الثيروكسين الحر', 'FT4'],
            ['thyroid', 'free-t3', 'Free T3', 'ثلاثي يود الثيرونين الحر', 'FT3'],
            ['coagulation', 'pt-inr', 'PT / INR', 'زمن البروثرومبين / النسبة المعيارية الدولية', 'PT/INR'],
            ['coagulation', 'aptt', 'aPTT', 'زمن الثرومبوبلاستين الجزئي المنشط', 'aPTT'],
            ['infectious-disease', 'malaria', 'Malaria Test', 'فحص الملاريا', null],
            ['infectious-disease', 'hiv-screening', 'HIV Screening', 'فحص فيروس نقص المناعة', 'HIV'],
            ['infectious-disease', 'hbsag', 'HBsAg', 'مستضد التهاب الكبد ب', 'HBsAg'],
            ['infectious-disease', 'hcv-screening', 'Hepatitis C Screening', 'فحص التهاب الكبد ج', 'HCV'],
            ['urine-stool', 'urinalysis', 'Urinalysis', 'تحليل البول', null],
            ['urine-stool', 'stool-analysis', 'Stool Analysis', 'تحليل البراز', null],
            ['pregnancy-hormones', 'beta-hcg', 'β-hCG', 'هرمون الحمل', 'β-hCG'],
        ];

        foreach ($tests as [$categorySlug, $slug, $nameEn, $nameAr, $shortName]) {
            DB::table('lab_tests')->updateOrInsert(
                ['slug' => $slug],
                [
                    'lab_test_category_id' => $categoryIds[$categorySlug],
                    'name_en' => $nameEn,
                    'name_ar' => $nameAr,
                    'short_name' => $shortName,
                    'is_active' => true,
                    'updated_at' => $now,
                    'created_at' => $now,
                ],
            );
        }
    }
}
