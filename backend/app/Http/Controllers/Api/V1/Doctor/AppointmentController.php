<?php

namespace App\Http\Controllers\Api\V1\Doctor;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Support\ProviderAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        ProviderAccess::assertVerified($profile);
        $record = DB::transaction(function () use ($profile, $appointment) {
            $record = $profile->appointments()->lockForUpdate()->findOrFail($appointment);
            abort_unless($record->status === AppointmentStatus::InProgress, 409, 'Only an appointment in progress can be ended.');
            $record->update(['status' => AppointmentStatus::Completed, 'completed_at' => now()]);

            return $record;
        });

        return new AppointmentResource($record->fresh(['patient:id,name', 'homeVisitDetail.location']));
    }

    public function start(Request $request, int $appointment): AppointmentResource
    {
        $profile = $request->user()->doctorProfile()->firstOrFail();
        ProviderAccess::assertVerified($profile);
        $record = DB::transaction(function () use ($profile, $appointment) {
            $record = $profile->appointments()->lockForUpdate()->findOrFail($appointment);
            abort_unless($record->status === AppointmentStatus::Confirmed, 409, 'Only a confirmed appointment can be started.');
            abort_if(now()->lt($record->starts_at), 409, 'This appointment cannot be started before its scheduled time.');
            $record->update(['status' => AppointmentStatus::InProgress, 'started_at' => now()]);

            return $record;
        });

        return new AppointmentResource($record->fresh(['patient:id,name', 'homeVisitDetail.location']));
    }
}
