<?php

return [
    /*
    | DEVELOPMENT/DEMO ONLY. When enabled, a newly registered doctor who
    | selects an existing approved city starts as verified so the complete
    | scheduling and booking flow can be demonstrated. Providers with an
    | unresolved city proposal remain pending. Keep this false in production.
    */
    'demo_auto_verify_doctors' => (bool) env('MEDACCESS_DEMO_AUTO_VERIFY_DOCTORS', false),

    /*
    | Demo environments can surface a provider after one legitimate review.
    | Production should explicitly set this to 3 (or another approved value).
    */
    'featured_doctor_min_reviews' => (int) env(
        'FEATURED_DOCTOR_MIN_REVIEWS',
        env('APP_ENV', 'production') === 'production' ? 3 : 1
    ),
];
