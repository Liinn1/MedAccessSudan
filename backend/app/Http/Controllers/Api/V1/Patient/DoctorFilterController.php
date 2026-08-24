<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\Specialization;
use Illuminate\Http\JsonResponse;

class DoctorFilterController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $fields = ['code', 'name_en', 'name_ar'];

        return response()->json(['data' => [
            'specializations' => Specialization::query()->where('is_active', true)->orderBy('id')->get($fields),
            'locations' => Location::query()->where('is_active', true)->orderBy('name_en')->get($fields),
        ]]);
    }
}
