import { apiClient } from './apiClient'

export type RateableProvider = 'doctor' | 'laboratory'

export interface ProviderReview { id: number; rating: number; comment: string | null; created_at: string }

export interface ProviderRatingSummary { average_rating: number; review_count: number }

/** One rating per fulfilled service: a completed appointment or a laboratory order with a released result. */
export async function submitProviderReview(provider: RateableProvider, serviceId: number, input: { rating: number; comment?: string }): Promise<ProviderReview> {
  const path = provider === 'doctor'
    ? `/api/v1/patient/appointments/${serviceId}/review`
    : `/api/v1/patient/laboratory-orders/${serviceId}/review`
  const response = await apiClient.post<{ data: ProviderReview }>(path, input)
  return response.data
}
