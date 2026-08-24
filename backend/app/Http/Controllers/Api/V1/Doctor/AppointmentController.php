<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function __invoke(Request $request)
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();

        return AppointmentResource::collection($profile->appointments()->with('patient:id,name')->orderBy('starts_at')->get());
    }
}
