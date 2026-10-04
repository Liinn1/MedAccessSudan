<?php

namespace Database\Seeders;

use App\Models\LabTest;
use App\Models\LabTestCategory;
use Illuminate\Database\Seeder;

class LabTestCatalogSeeder extends Seeder
{
    /**
     * Idempotent bilingual master catalogue. Existing slugs keep their IDs.
     */
    public function run(): void
    {
        foreach ($this->categories() as $index => $category) {
            LabTestCategory::query()->updateOrCreate(
                ['slug' => $category['slug']],
                [
                    'name_en' => $category['name_en'],
                    'name_ar' => $category['name_ar'],
                    'sort_order' => $index + 1,
                ],
            );
        }

        $categoryIds = LabTestCategory::query()->pluck('id', 'slug');

        LabTestCategory::query()
            ->where('slug', 'urine-stool')
            ->whereDoesntHave('tests')
            ->delete();

        foreach ($this->tests() as $test) {
            [$categorySlug, $slug, $nameEn, $nameAr, $shortName, $specimen, $aliases] = $test;
            LabTest::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'lab_test_category_id' => $categoryIds[$categorySlug],
                    'name_en' => $nameEn,
                    'name_ar' => $nameAr,
                    'short_name' => $shortName,
                    'specimen_type' => $specimen,
                    'search_aliases' => $aliases,
                    'is_active' => true,
                ],
            );
        }
    }

    /** @return list<array{slug: string, name_en: string, name_ar: string}> */
    private function categories(): array
    {
        return [
            ['slug' => 'hematology', 'name_en' => 'Hematology / Blood Disorders', 'name_ar' => 'أمراض الدم'],
            ['slug' => 'clinical-chemistry', 'name_en' => 'Clinical Chemistry', 'name_ar' => 'الكيمياء السريرية'],
            ['slug' => 'diabetes', 'name_en' => 'Diabetes / Glucose', 'name_ar' => 'السكري / الجلوكوز'],
            ['slug' => 'lipid-profile', 'name_en' => 'Lipid Profile', 'name_ar' => 'صورة الدهون'],
            ['slug' => 'liver-function', 'name_en' => 'Liver Function', 'name_ar' => 'وظائف الكبد'],
            ['slug' => 'kidney-electrolytes', 'name_en' => 'Kidney / Renal Function', 'name_ar' => 'وظائف الكلى'],
            ['slug' => 'electrolytes', 'name_en' => 'Electrolytes', 'name_ar' => 'الكهارل'],
            ['slug' => 'thyroid', 'name_en' => 'Thyroid', 'name_ar' => 'الغدة الدرقية'],
            ['slug' => 'hormones-endocrine', 'name_en' => 'Hormones / Endocrine', 'name_ar' => 'الهرمونات / الغدد الصماء'],
            ['slug' => 'pregnancy-hormones', 'name_en' => 'Pregnancy / Reproductive', 'name_ar' => 'الحمل / الإنجاب'],
            ['slug' => 'coagulation', 'name_en' => 'Coagulation', 'name_ar' => 'التخثر'],
            ['slug' => 'cardiac-markers', 'name_en' => 'Cardiac Markers', 'name_ar' => 'علامات القلب'],
            ['slug' => 'vitamins-minerals', 'name_en' => 'Vitamins / Minerals / Nutrition', 'name_ar' => 'الفيتامينات والمعادن'],
            ['slug' => 'inflammation', 'name_en' => 'Inflammation', 'name_ar' => 'الالتهاب'],
            ['slug' => 'infectious-disease', 'name_en' => 'Infectious Diseases', 'name_ar' => 'الأمراض المعدية'],
            ['slug' => 'immunology-serology', 'name_en' => 'Immunology / Serology', 'name_ar' => 'المناعة / الأمصال'],
            ['slug' => 'autoimmune', 'name_en' => 'Autoimmune Tests', 'name_ar' => 'اختبارات المناعة الذاتية'],
            ['slug' => 'allergy', 'name_en' => 'Allergy', 'name_ar' => 'الحساسية'],
            ['slug' => 'urine', 'name_en' => 'Urine Tests', 'name_ar' => 'تحاليل البول'],
            ['slug' => 'stool-parasitology', 'name_en' => 'Stool / Parasitology', 'name_ar' => 'البراز / الطفيليات'],
            ['slug' => 'microbiology', 'name_en' => 'Microbiology / Cultures', 'name_ar' => 'الأحياء الدقيقة / المزارع'],
            ['slug' => 'tumor-markers', 'name_en' => 'Tumor Markers', 'name_ar' => 'دلالات الأورام'],
            ['slug' => 'blood-group', 'name_en' => 'Blood Group / Transfusion', 'name_ar' => 'فصيلة الدم / نقل الدم'],
        ];
    }

    /**
     * @return list<array{0: string, 1: string, 2: string, 3: string, 4: ?string, 5: string, 6: list<string>}>
     */
    private function tests(): array
    {
        return [
            ['hematology', 'cbc', 'Complete Blood Count (CBC)', 'صورة دم كاملة', 'CBC', 'blood', ['complete blood count', 'full blood count', 'fbc', 'cbc']],
            ['hematology', 'hemoglobin', 'Hemoglobin (Hb)', 'الهيموغلوبين', 'Hb', 'blood', ['haemoglobin', 'hb']],
            ['hematology', 'hematocrit', 'Hematocrit (HCT/PCV)', 'الهيماتوكريت', 'HCT', 'blood', ['pcv', 'packed cell volume', 'hct']],
            ['hematology', 'rbc-count', 'Red Blood Cell Count (RBC)', 'عدد كريات الدم الحمراء', 'RBC', 'blood', ['erythrocyte count']],
            ['hematology', 'wbc-count', 'White Blood Cell Count (WBC)', 'عدد كريات الدم البيضاء', 'WBC', 'blood', ['leukocyte count']],
            ['hematology', 'platelet-count', 'Platelet Count', 'عدد الصفائح الدموية', 'PLT', 'blood', ['platelets', 'thrombocyte count']],
            ['hematology', 'differential-wbc', 'Differential WBC Count', 'تعداد الدم التفريقي', 'Diff', 'blood', ['wbc differential', 'diff count']],
            ['hematology', 'peripheral-blood-film', 'Peripheral Blood Film', 'فيلم دم محيطي', 'PBF', 'blood', ['blood smear', 'peripheral smear']],
            ['hematology', 'reticulocyte-count', 'Reticulocyte Count', 'عد الخلايا الشبكية', null, 'blood', ['retic count']],
            ['hematology', 'esr', 'Erythrocyte Sedimentation Rate (ESR)', 'سرعة ترسيب الدم', 'ESR', 'blood', ['sed rate', 'sedimentation rate']],
            ['hematology', 'sickle-cell-screen', 'Sickle Cell Screening', 'فحص الخلايا المنجلية', null, 'blood', ['sickling test', 'sickle cell']],
            ['hematology', 'hemoglobin-electrophoresis', 'Hemoglobin Electrophoresis', 'الرحلان الكهربائي للهيموغلوبين', null, 'blood', ['hb electrophoresis']],
            ['hematology', 'blood-film-malaria', 'Blood Film for Malaria', 'فيلم دم للملاريا', null, 'blood', ['malaria film']],
            ['hematology', 'mcv-mch-mchc', 'Red Cell Indices (MCV/MCH/MCHC)', 'مؤشرات كريات الدم الحمراء', null, 'blood', ['mcv', 'mch', 'mchc']],

            ['clinical-chemistry', 'amylase', 'Amylase', 'الأميليز', null, 'serum', []],
            ['clinical-chemistry', 'lipase', 'Lipase', 'الليباز', null, 'serum', []],
            ['clinical-chemistry', 'ck-total', 'Creatine Kinase (CK)', 'كيناز الكرياتين', 'CK', 'serum', ['cpk', 'creatine phosphokinase']],
            ['clinical-chemistry', 'ldh', 'Lactate Dehydrogenase (LDH)', 'نازعة هيدروجين اللاكتات', 'LDH', 'serum', []],
            ['clinical-chemistry', 'ammonia', 'Ammonia', 'الأمونيا', null, 'plasma', []],

            ['diabetes', 'fasting-blood-glucose', 'Fasting Blood Glucose', 'سكر الدم الصائم', 'FBG', 'blood', ['fasting glucose', 'fbs', 'fasting blood sugar']],
            ['diabetes', 'random-blood-glucose', 'Random Blood Glucose', 'سكر الدم العشوائي', 'RBG', 'blood', ['random glucose', 'rbs']],
            ['diabetes', 'postprandial-glucose', 'Postprandial Blood Glucose', 'سكر الدم بعد الوجبة', 'PPBG', 'blood', ['2hpp', 'post prandial glucose']],
            ['diabetes', 'hba1c', 'HbA1c', 'السكر التراكمي', 'HbA1c', 'blood', ['a1c', 'glycated hemoglobin', 'glycosylated haemoglobin', 'hba1c']],
            ['diabetes', 'ogtt', 'Oral Glucose Tolerance Test (OGTT)', 'اختبار تحمل الجلوكوز الفموي', 'OGTT', 'blood', ['gtt', 'glucose tolerance test']],
            ['diabetes', 'fructosamine', 'Fructosamine', 'الفركتوزامين', null, 'serum', []],

            ['lipid-profile', 'lipid-profile', 'Lipid Profile', 'صورة الدهون', null, 'serum', ['lipid panel', 'fasting lipids']],
            ['lipid-profile', 'total-cholesterol', 'Total Cholesterol', 'الكوليسترول الكلي', null, 'serum', ['cholesterol']],
            ['lipid-profile', 'hdl-cholesterol', 'HDL Cholesterol', 'كوليسترول عالي الكثافة', 'HDL', 'serum', ['hdl']],
            ['lipid-profile', 'ldl-cholesterol', 'LDL Cholesterol', 'كوليسترول منخفض الكثافة', 'LDL', 'serum', ['ldl']],
            ['lipid-profile', 'triglycerides', 'Triglycerides', 'الدهون الثلاثية', 'TG', 'serum', ['trigs']],
            ['lipid-profile', 'non-hdl-cholesterol', 'Non-HDL Cholesterol', 'كوليسترول غير عالي الكثافة', null, 'serum', []],

            ['liver-function', 'lft-panel', 'Liver Function Tests (LFT)', 'وظائف الكبد', 'LFT', 'serum', ['liver panel', 'hepatic panel']],
            ['liver-function', 'alt', 'ALT', 'ناقلة أمين الألانين', 'ALT', 'serum', ['sgpt', 'alanine aminotransferase']],
            ['liver-function', 'ast', 'AST', 'ناقلة أمين الأسبارتات', 'AST', 'serum', ['sgot', 'aspartate aminotransferase']],
            ['liver-function', 'alp', 'ALP', 'الفوسفاتاز القلوي', 'ALP', 'serum', ['alkaline phosphatase']],
            ['liver-function', 'ggt', 'GGT', 'ناقلة غاما غلوتاميل', 'GGT', 'serum', ['gamma gt', 'ggtp']],
            ['liver-function', 'total-bilirubin', 'Total Bilirubin', 'البيليروبين الكلي', null, 'serum', ['bilirubin']],
            ['liver-function', 'direct-bilirubin', 'Direct Bilirubin', 'البيليروبين المباشر', null, 'serum', ['conjugated bilirubin']],
            ['liver-function', 'indirect-bilirubin', 'Indirect Bilirubin', 'البيليروبين غير المباشر', null, 'serum', ['unconjugated bilirubin']],
            ['liver-function', 'albumin', 'Albumin', 'الألبومين', null, 'serum', []],
            ['liver-function', 'total-protein', 'Total Protein', 'البروتين الكلي', null, 'serum', []],
            ['liver-function', 'globulin', 'Globulin', 'الغلوبولين', null, 'serum', []],

            ['kidney-electrolytes', 'rft-panel', 'Renal Function Tests (RFT)', 'وظائف الكلى', 'RFT', 'serum', ['kidney function', 'kft']],
            ['kidney-electrolytes', 'creatinine', 'Creatinine', 'الكرياتينين', null, 'serum', ['serum creatinine']],
            ['kidney-electrolytes', 'urea', 'Urea / BUN', 'اليوريا', 'BUN', 'serum', ['blood urea nitrogen', 'bun', 'urea']],
            ['kidney-electrolytes', 'egfr', 'eGFR', 'معدل الترشيح الكبيبي التقديري', 'eGFR', 'serum', ['estimated gfr', 'gfr']],
            ['kidney-electrolytes', 'uric-acid', 'Uric Acid', 'حمض اليوريك', null, 'serum', ['urate']],
            ['kidney-electrolytes', 'cystatin-c', 'Cystatin C', 'السيستاتين سي', null, 'serum', []],

            ['electrolytes', 'electrolyte-panel', 'Electrolyte Panel', 'لوحة الكهارل', null, 'serum', ['electrolytes', 'lytes']],
            ['electrolytes', 'sodium', 'Sodium', 'الصوديوم', 'Na', 'serum', ['na']],
            ['electrolytes', 'potassium', 'Potassium', 'البوتاسيوم', 'K', 'serum', ['k']],
            ['electrolytes', 'chloride', 'Chloride', 'الكلوريد', 'Cl', 'serum', ['cl']],
            ['electrolytes', 'bicarbonate', 'Bicarbonate / CO2', 'البيكربونات', 'HCO3', 'serum', ['co2', 'total co2']],
            ['electrolytes', 'serum-calcium', 'Calcium', 'الكالسيوم', 'Ca', 'serum', ['serum calcium']],
            ['electrolytes', 'serum-magnesium', 'Magnesium', 'المغنيسيوم', 'Mg', 'serum', ['serum magnesium']],
            ['electrolytes', 'serum-phosphate', 'Phosphate', 'الفوسفات', 'PO4', 'serum', ['phosphorus']],

            ['thyroid', 'tsh', 'TSH', 'الهرمون المنبه للدرقية', 'TSH', 'serum', ['thyroid stimulating hormone']],
            ['thyroid', 'free-t4', 'Free T4', 'الثيروكسين الحر', 'FT4', 'serum', ['ft4', 'free thyroxine']],
            ['thyroid', 'free-t3', 'Free T3', 'ثلاثي يود الثيرونين الحر', 'FT3', 'serum', ['ft3']],
            ['thyroid', 'total-t4', 'Total T4', 'الثيروكسين الكلي', 'T4', 'serum', ['thyroxine']],
            ['thyroid', 'total-t3', 'Total T3', 'ثلاثي يود الثيرونين الكلي', 'T3', 'serum', []],
            ['thyroid', 'anti-tpo', 'Anti-TPO', 'الأجسام المضادة للبيروكسيداز الدرقي', 'Anti-TPO', 'serum', ['tpo antibodies', 'anti thyroid peroxidase']],
            ['thyroid', 'anti-tg', 'Thyroglobulin Antibodies / Anti-Tg', 'الأجسام المضادة للثيروغلوبيولين', 'Anti-Tg', 'serum', ['anti thyroglobulin', 'tgab']],
            ['thyroid', 'thyroid-profile', 'Thyroid Profile', 'صورة الغدة الدرقية', null, 'serum', ['tft', 'thyroid function tests']],

            ['hormones-endocrine', 'prolactin', 'Prolactin', 'البرولاكتين', 'PRL', 'serum', []],
            ['hormones-endocrine', 'fsh', 'FSH', 'الهرمون المنبه للجريب', 'FSH', 'serum', ['follicle stimulating hormone']],
            ['hormones-endocrine', 'lh', 'LH', 'الهرمون المنبه للجسم الأصفر', 'LH', 'serum', ['luteinizing hormone']],
            ['hormones-endocrine', 'estradiol', 'Estradiol', 'الإستراديول', 'E2', 'serum', ['e2', 'oestradiol']],
            ['hormones-endocrine', 'progesterone', 'Progesterone', 'البروجستيرون', null, 'serum', []],
            ['hormones-endocrine', 'testosterone', 'Testosterone', 'التستوستيرون', null, 'serum', ['total testosterone']],
            ['hormones-endocrine', 'free-testosterone', 'Free Testosterone', 'التستوستيرون الحر', null, 'serum', []],
            ['hormones-endocrine', 'cortisol', 'Cortisol', 'الكورتيزول', null, 'serum', []],
            ['hormones-endocrine', 'dheas', 'DHEA-S', 'كبريتات ديهيدرو إيبي أندروستيرون', 'DHEA-S', 'serum', ['dheas']],
            ['hormones-endocrine', 'insulin', 'Insulin', 'الإنسولين', null, 'serum', ['fasting insulin']],
            ['hormones-endocrine', 'amh', 'AMH', 'الهرمون المضاد للمولر', 'AMH', 'serum', ['anti mullerian hormone']],
            ['hormones-endocrine', 'pth', 'PTH', 'الهرمون الجار درقي', 'PTH', 'serum', ['parathyroid hormone', 'intact pth']],
            ['hormones-endocrine', 'growth-hormone', 'Growth Hormone', 'هرمون النمو', 'GH', 'serum', ['gh']],

            ['pregnancy-hormones', 'urine-pregnancy-test', 'Urine Pregnancy Test', 'اختبار الحمل في البول', 'UPT', 'urine', ['upt', 'urine hcg', 'pregnancy test']],
            ['pregnancy-hormones', 'serum-hcg', 'Serum hCG', 'هرمون الحمل في المصل', 'hCG', 'serum', ['qualitative hcg']],
            ['pregnancy-hormones', 'beta-hcg', 'Quantitative beta-hCG', 'هرمون الحمل الكمي', 'β-hCG', 'serum', ['beta hcg', 'quantitative hcg', 'bhcg']],

            ['coagulation', 'pt', 'Prothrombin Time (PT)', 'زمن البروثرومبين', 'PT', 'plasma', ['prothrombin time']],
            ['coagulation', 'inr', 'INR', 'النسبة المعيارية الدولية', 'INR', 'plasma', ['international normalized ratio']],
            ['coagulation', 'pt-inr', 'PT / INR', 'زمن البروثرومبين / النسبة المعيارية الدولية', 'PT/INR', 'plasma', ['pt inr']],
            ['coagulation', 'aptt', 'aPTT', 'زمن الثرومبوبلاستين الجزئي المنشط', 'aPTT', 'plasma', ['ptt', 'partial thromboplastin time']],
            ['coagulation', 'fibrinogen', 'Fibrinogen', 'الفيبرينوجين', null, 'plasma', []],
            ['coagulation', 'd-dimer', 'D-Dimer', 'دي دايمر', null, 'plasma', ['ddimer']],
            ['coagulation', 'bleeding-time', 'Bleeding Time', 'زمن النزف', 'BT', 'blood', []],
            ['coagulation', 'clotting-time', 'Clotting Time', 'زمن التجلط', 'CT', 'blood', []],

            ['cardiac-markers', 'troponin', 'Troponin', 'التروبونين', null, 'serum', ['troponin i', 'troponin t', 'hs troponin']],
            ['cardiac-markers', 'ck-mb', 'CK-MB', 'كيناز الكرياتين MB', 'CK-MB', 'serum', ['ckmb']],
            ['cardiac-markers', 'bnp', 'BNP', 'الببتيد الدماغي المدر للصوديوم', 'BNP', 'plasma', ['brain natriuretic peptide']],
            ['cardiac-markers', 'nt-probnp', 'NT-proBNP', 'الجزء الطرفي للببتيد الدماغي', 'NT-proBNP', 'plasma', ['ntprobnp']],
            ['cardiac-markers', 'myoglobin', 'Myoglobin', 'الميوغلوبين', null, 'serum', []],

            ['vitamins-minerals', 'ferritin', 'Ferritin', 'الفيريتين', null, 'serum', []],
            ['vitamins-minerals', 'serum-iron', 'Serum Iron', 'حديد المصل', null, 'serum', ['iron']],
            ['vitamins-minerals', 'tibc', 'TIBC', 'السعة الكلية الرابطة للحديد', 'TIBC', 'serum', ['total iron binding capacity']],
            ['vitamins-minerals', 'transferrin', 'Transferrin', 'الترانسفيرين', null, 'serum', []],
            ['vitamins-minerals', 'transferrin-saturation', 'Transferrin Saturation', 'تشبع الترانسفيرين', null, 'serum', ['tsat']],
            ['vitamins-minerals', 'vitamin-b12', 'Vitamin B12', 'فيتامين ب12', 'B12', 'serum', ['cobalamin', 'b12']],
            ['vitamins-minerals', 'folate', 'Folate', 'الفولات', null, 'serum', ['folic acid']],
            ['vitamins-minerals', 'vitamin-d', 'Vitamin D', 'فيتامين د', 'Vit D', 'serum', ['25 oh vitamin d', '25-hydroxy vitamin d', 'vit d']],
            ['vitamins-minerals', 'iron-studies', 'Iron Studies', 'دراسات الحديد', null, 'serum', ['iron profile']],
            ['vitamins-minerals', 'zinc', 'Zinc', 'الزنك', null, 'serum', []],

            ['inflammation', 'crp', 'CRP', 'البروتين التفاعلي سي', 'CRP', 'serum', ['c reactive protein']],
            ['inflammation', 'hs-crp', 'High-sensitivity CRP', 'البروتين التفاعلي سي عالي الحساسية', 'hs-CRP', 'serum', ['high sensitivity crp', 'hscrp']],
            ['inflammation', 'procalcitonin', 'Procalcitonin', 'البروكالسيتونين', 'PCT', 'serum', []],

            ['infectious-disease', 'hiv-screening', 'HIV Screening', 'فحص فيروس نقص المناعة', 'HIV', 'serum', ['hiv', 'hiv ag ab']],
            ['infectious-disease', 'hbsag', 'Hepatitis B surface antigen (HBsAg)', 'مستضد التهاب الكبد ب', 'HBsAg', 'serum', ['hepatitis b', 'hbsag']],
            ['infectious-disease', 'anti-hbs', 'Anti-HBs', 'الأجسام المضادة لالتهاب الكبد ب', 'Anti-HBs', 'serum', ['hepatitis b antibody']],
            ['infectious-disease', 'hcv-screening', 'Hepatitis C antibody', 'الأجسام المضادة لالتهاب الكبد ج', 'HCV', 'serum', ['hepatitis c', 'anti hcv']],
            ['infectious-disease', 'syphilis-screening', 'Syphilis Screening', 'فحص الزهري', 'VDRL', 'serum', ['vdrl', 'rpr', 'tpha', 'syphilis']],
            ['infectious-disease', 'malaria', 'Malaria Test', 'فحص الملاريا', null, 'blood', ['malaria antigen', 'rdt malaria']],
            ['infectious-disease', 'dengue-ns1', 'Dengue NS1 Antigen', 'مستضد حمى الضنك', 'NS1', 'serum', ['dengue', 'dengue test']],
            ['infectious-disease', 'dengue-igg-igm', 'Dengue IgG / IgM', 'أجسام مضادة لحمى الضنك', null, 'serum', ['dengue antibodies']],
            ['infectious-disease', 'h-pylori-antigen', 'H. pylori Stool Antigen', 'مستضد الملوية البوابية في البراز', null, 'stool', ['helicobacter pylori stool', 'h pylori']],
            ['infectious-disease', 'h-pylori-antibody', 'H. pylori Antibody', 'الأجسام المضادة للملوية البوابية', null, 'serum', ['helicobacter pylori']],
            ['infectious-disease', 'widal', 'Widal Test', 'اختبار فيدال', null, 'serum', ['typhoid serology']],
            ['infectious-disease', 'brucella', 'Brucella Serology', 'فحص البروسيلا', null, 'serum', ['brucella']],
            ['infectious-disease', 'covid-antigen', 'COVID-19 Antigen', 'مستضد كوفيد-19', null, 'swab', ['sars cov 2 antigen']],
            ['infectious-disease', 'tb-igra', 'TB Interferon Gamma Release Assay', 'فحص السل بالإنترفيرون', 'IGRA', 'blood', ['quantiferon', 'tb blood test']],

            ['immunology-serology', 'aso', 'ASO Titre', 'عيار مضاد الستربتوليزين', 'ASO', 'serum', ['anti streptolysin o']],
            ['immunology-serology', 'igm', 'Immunoglobulin M (IgM)', 'الغلوبولين المناعي م', 'IgM', 'serum', []],
            ['immunology-serology', 'igg', 'Immunoglobulin G (IgG)', 'الغلوبولين المناعي ج', 'IgG', 'serum', []],
            ['immunology-serology', 'ige-total', 'Total IgE', 'الغلوبولين المناعي هـ الكلي', 'IgE', 'serum', []],
            ['immunology-serology', 'c3', 'Complement C3', 'المتممة سي3', 'C3', 'serum', []],
            ['immunology-serology', 'c4', 'Complement C4', 'المتممة سي4', 'C4', 'serum', []],

            ['autoimmune', 'ana', 'ANA', 'الأجسام المضادة للنواة', 'ANA', 'serum', ['antinuclear antibody']],
            ['autoimmune', 'rheumatoid-factor', 'Rheumatoid Factor', 'عامل الروماتويد', 'RF', 'serum', ['rf']],
            ['autoimmune', 'anti-ccp', 'Anti-CCP', 'الأجسام المضادة للسيترولين', 'Anti-CCP', 'serum', ['anti cyclic citrullinated peptide']],
            ['autoimmune', 'anti-dsdna', 'Anti-dsDNA', 'الأجسام المضادة للدنا مزدوج السلسلة', 'Anti-dsDNA', 'serum', ['dsdna']],
            ['autoimmune', 'anca', 'ANCA', 'الأجسام المضادة للسيتوبلازم', 'ANCA', 'serum', ['p anca', 'c anca']],
            ['autoimmune', 'anti-sma', 'Anti-Smooth Muscle Antibody', 'الأجسام المضادة للعضلات الملساء', 'ASMA', 'serum', []],

            ['allergy', 'food-allergy-panel', 'Food Allergy Panel', 'لوحة حساسية الطعام', null, 'serum', ['food rast']],
            ['allergy', 'inhalant-allergy-panel', 'Inhalant Allergy Panel', 'لوحة حساسية الاستنشاق', null, 'serum', ['aeroallergen panel']],

            ['urine', 'urinalysis', 'Routine Urinalysis', 'تحليل البول الروتيني', 'UA', 'urine', ['urine analysis', 'urine routine', 'urine exam']],
            ['urine', 'urine-microscopy', 'Urine Microscopy', 'فحص البول المجهري', null, 'urine', ['urine sediment']],
            ['urine', 'urine-protein', 'Urine Protein', 'بروتين البول', null, 'urine', ['proteinuria']],
            ['urine', 'urine-glucose', 'Urine Glucose', 'جلوكوز البول', null, 'urine', ['glycosuria']],
            ['urine', 'urine-ketones', 'Urine Ketones', 'كيتونات البول', null, 'urine', []],
            ['urine', 'urine-albumin', 'Urine Albumin', 'ألبومين البول', 'MAU', 'urine', ['microalbumin']],
            ['urine', 'urine-acr', 'Urine Albumin/Creatinine Ratio', 'نسبة الألبومين إلى الكرياتينين في البول', 'ACR', 'urine', ['albumin creatinine ratio', 'uacr']],
            ['urine', '24h-urine-protein', '24-Hour Urine Protein', 'بروتين بول 24 ساعة', null, 'urine', ['24 hour urine protein']],
            ['urine', '24h-urine-creatinine', '24-Hour Urine Creatinine', 'كرياتينين بول 24 ساعة', null, 'urine', []],
            ['urine', 'urine-pregnancy-chemical', 'Urine hCG (Laboratory)', 'هرمون الحمل في البول مخبرياً', null, 'urine', ['urine hcg lab']],

            ['stool-parasitology', 'stool-analysis', 'Routine Stool Analysis', 'تحليل البراز الروتيني', null, 'stool', ['stool exam', 'stool routine']],
            ['stool-parasitology', 'stool-microscopy', 'Stool Microscopy', 'فحص البراز المجهري', null, 'stool', []],
            ['stool-parasitology', 'stool-ova-parasites', 'Stool Ova and Parasites', 'بيوض وطفيليات البراز', 'O&P', 'stool', ['o and p', 'stool parasites']],
            ['stool-parasitology', 'fobt', 'Fecal Occult Blood / FOBT', 'الدم الخفي في البراز', 'FOBT', 'stool', ['fecal occult blood test', 'stool occult blood', 'fob']],
            ['stool-parasitology', 'fecal-calprotectin', 'Fecal Calprotectin', 'الكالبروتكتين البرازي', null, 'stool', ['calprotectin']],
            ['stool-parasitology', 'stool-reducing-substances', 'Stool Reducing Substances', 'المواد المختزلة في البراز', null, 'stool', []],

            ['microbiology', 'blood-culture', 'Blood Culture', 'مزرعة الدم', null, 'blood', ['blood c s']],
            ['microbiology', 'urine-culture', 'Urine Culture and Sensitivity', 'مزرعة البول والتحسس', 'Urine C&S', 'urine', ['urine cs', 'urine culture']],
            ['microbiology', 'stool-culture', 'Stool Culture', 'مزرعة البراز', 'Stool C&S', 'stool', ['stool cs']],
            ['microbiology', 'sputum-culture', 'Sputum Culture', 'مزرعة البلغم', 'Sputum C&S', 'sputum', ['sputum cs']],
            ['microbiology', 'wound-swab-culture', 'Wound Swab Culture', 'مزرعة مسحة الجرح', null, 'swab', ['wound cs']],
            ['microbiology', 'throat-swab-culture', 'Throat Swab Culture', 'مزرعة مسحة الحلق', null, 'swab', ['throat cs']],
            ['microbiology', 'hvs-culture', 'High Vaginal Swab Culture', 'مزرعة المسحة المهبلية', 'HVS', 'swab', ['hvs', 'vaginal swab culture']],
            ['microbiology', 'gram-stain', 'Gram Stain', 'صبغة غرام', null, 'other', []],
            ['microbiology', 'afb-smear', 'AFB Smear', 'مسحة العصيات المقاومة للحمض', 'AFB', 'sputum', ['zn stain', 'acid fast bacilli']],

            ['tumor-markers', 'psa', 'PSA', 'المستضد البروستاتي النوعي', 'PSA', 'serum', ['prostate specific antigen']],
            ['tumor-markers', 'free-psa', 'Free PSA', 'المستضد البروستاتي الحر', null, 'serum', []],
            ['tumor-markers', 'afp', 'AFP', 'ألفا فيتو بروتين', 'AFP', 'serum', ['alpha fetoprotein']],
            ['tumor-markers', 'cea', 'CEA', 'المستضد السرطاني الجنيني', 'CEA', 'serum', ['carcinoembryonic antigen']],
            ['tumor-markers', 'ca-125', 'CA-125', 'المستضد CA-125', 'CA-125', 'serum', ['ca125']],
            ['tumor-markers', 'ca-19-9', 'CA 19-9', 'المستضد CA 19-9', 'CA 19-9', 'serum', ['ca19-9']],
            ['tumor-markers', 'ca-15-3', 'CA 15-3', 'المستضد CA 15-3', 'CA 15-3', 'serum', ['ca15-3']],

            ['blood-group', 'abo-blood-group', 'ABO Blood Group', 'فصيلة الدم ABO', 'ABO', 'blood', ['blood group']],
            ['blood-group', 'rh-factor', 'Rh Factor', 'عامل ريسس', 'Rh', 'blood', ['rhesus', 'rh typing']],
            ['blood-group', 'blood-group-rh', 'Blood Group & Rh', 'فصيلة الدم وعامل ريسس', null, 'blood', ['abo rh', 'blood group and rh']],
            ['blood-group', 'crossmatch', 'Crossmatch', 'اختبار التوافق', null, 'blood', ['compatibility testing']],
            ['blood-group', 'direct-coombs', 'Direct Antiglobulin Test / Direct Coombs', 'اختبار كومبس المباشر', 'DAT', 'blood', ['direct coombs', 'dat']],
            ['blood-group', 'indirect-coombs', 'Indirect Antiglobulin Test / Indirect Coombs', 'اختبار كومبس غير المباشر', 'IAT', 'blood', ['indirect coombs', 'iat']],
        ];
    }
}
