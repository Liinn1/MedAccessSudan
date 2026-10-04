<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Shared rating aggregate for any provider profile that defines a `reviews()` relation.
 * Doctors and laboratories expose the same `average_rating` / `review_count` shape.
 */
trait HasProviderRatings
{
    public function scopeWithRatingSummary(Builder $query): Builder
    {
        return $query->withCount('reviews')->withAvg('reviews', 'rating');
    }

    public function scopeTopRated(Builder $query, int $minimumReviews = 1): Builder
    {
        return $query->has('reviews', '>=', max(1, $minimumReviews))
            ->withRatingSummary()
            ->orderByDesc('reviews_avg_rating')->orderByDesc('reviews_count')->orderBy($this->qualifyColumn('id'));
    }

    /** @return array{average_rating: float, review_count: int} */
    public function ratingSummary(): array
    {
        return [
            'average_rating' => round((float) ($this->reviews_avg_rating ?? 0), 1),
            'review_count' => (int) ($this->reviews_count ?? 0),
        ];
    }
}
