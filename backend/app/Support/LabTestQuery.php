<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

class LabTestQuery
{
    public static function matchesSearch(Builder|QueryBuilder $query, string $search): void
    {
        $like = '%'.$search.'%';
        $query->where(function ($inner) use ($like) {
            $inner->where('name_en', 'like', $like)
                ->orWhere('name_ar', 'like', $like)
                ->orWhere('short_name', 'like', $like)
                ->orWhere('slug', 'like', $like)
                ->orWhere('search_aliases', 'like', $like)
                ->orWhere('specimen_type', 'like', $like)
                ->orWhereHas('category', function ($category) use ($like) {
                    $category->where('name_en', 'like', $like)
                        ->orWhere('name_ar', 'like', $like)
                        ->orWhere('slug', 'like', $like);
                });
        });
    }
}
