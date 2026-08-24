<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuthenticatedUserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurrentUserController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [
                'user' => new AuthenticatedUserResource($request->user()),
            ],
        ]);
    }
}
