<?php

namespace App\Services;

use App\Models\Location;
use Illuminate\Support\Str;

class CityNameNormalizer
{
    public function display(string $name): string
    {
        return (string) Str::of($name)->trim()->replaceMatches('/\s+/u', ' ');
    }

    public function comparison(string $name): string
    {
        return mb_strtolower($this->display($name), 'UTF-8');
    }

    public function uniqueCode(string $name): string
    {
        $base = Str::slug($this->display($name)) ?: 'city';
        $code = $base;
        $suffix = 2;

        while (Location::query()->where('code', $code)->exists()) {
            $code = $base.'-'.$suffix++;
        }

        return $code;
    }
}
