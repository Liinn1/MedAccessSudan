import { apiClient } from './apiClient'
import type { AuthenticatedUser } from './authService'

export interface PatientProfileInput {
  first_name: string
  last_name: string
  email: string
  phone: string
}

export async function updatePatientProfile(input: PatientProfileInput): Promise<AuthenticatedUser> {
  await apiClient.initializeCsrfProtection()
  const response = await apiClient.put<{ data: { user: AuthenticatedUser } }>('/api/v1/patient/profile', input)
  return response.data.user
}
