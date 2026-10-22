<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Http\Resources\LaboratoryOrderResource;
use App\Services\PatientUpcomingBookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UpcomingBookingController extends Controller
{
    public function __invoke(Request $request, PatientUpcomingBookingService $bookings): JsonResponse
    {
        $data = $bookings->forPatient($request->user())->map(function (array $booking) use ($request): array {
            return [
                'type' => $booking['type'],
                'scheduled_at' => $booking['scheduled_at']->toIso8601String(),
                ...isset($booking['appointment'])
                    ? ['appointment' => (new AppointmentResource($booking['appointment']))->resolve($request)]
                    : ['laboratory_order' => (new LaboratoryOrderResource($booking['laboratory_order']))->resolve($request)],
            ];
        });

        return response()->json(['data' => $data]);
    }
}
