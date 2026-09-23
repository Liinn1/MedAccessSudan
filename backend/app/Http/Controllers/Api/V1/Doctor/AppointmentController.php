<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();

        return AppointmentResource::collection($profile->appointments()->with(['patient:id,name', 'homeVisitDetail.location'])->orderBy('starts_at')->get());
    }

    public function complete(Request $request, int $appointment): AppointmentResource
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        $record = $profile->appointments()->with(['patient:id,name', 'homeVisitDetail.location'])->findOrFail($appointment);
        abort_unless($record->status === AppointmentStatus::Confirmed && $record->ends_at->isPast(), 409, 'Only past confirmed appointments can be completed.');
        $record->update(['status' => AppointmentStatus::Completed]);

        return new AppointmentResource($record->fresh(['patient:id,name', 'homeVisitDetail.location']));
    }
}
