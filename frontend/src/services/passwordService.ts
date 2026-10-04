import { apiClient, ApiError } from './apiClient'

export interface PasswordChallenge {
  challenge_id: string
  masked_email: string
  expires_in: number
  resend_after: number
}

function apiCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || typeof error.details !== 'object' || error.details === null || !('code' in error.details)) return undefined
  return typeof error.details.code === 'string' ? error.details.code : undefined
}

export function passwordChangeErrorKey(error: unknown, field: 'current' | 'password' | 'code' | 'mail'): string {
  if (error instanceof ApiError && error.status === 503) return 'security.errors.mail'
  if (apiCode(error) === 'MAIL_FAILED') return 'security.errors.mail'
  if (field === 'current') return 'security.errors.current'
  if (field === 'code') return 'security.errors.code'
  if (field === 'password') return 'security.errors.weak'
  return 'security.errors.generic'
}

export async function startPasswordChange(input: { current_password: string; password: string; password_confirmation: string }) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.post<{ data: PasswordChallenge }>('/api/v1/auth/password/change', input)).data
}

export async function resendPasswordChangeCode(challenge_id: string) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.post<{ data: PasswordChallenge }>('/api/v1/auth/password/change/resend', { challenge_id })).data
}

export async function confirmPasswordChange(input: { challenge_id: string; code: string }) {
  await apiClient.initializeCsrfProtection()
  await apiClient.post('/api/v1/auth/password/change/confirm', input)
}

export async function completePasswordSetup(input: { email: string; token: string; password: string; password_confirmation: string }) {
  await apiClient.initializeCsrfProtection()
  await apiClient.post('/api/v1/auth/password/setup', input)
}

export async function requestPasswordReset(email: string) {
  await apiClient.initializeCsrfProtection()
  return apiClient.post<{ data: PasswordChallenge; message: string }>('/api/v1/auth/password/forgot', { email })
}

export async function resendPasswordResetCode(email: string, challenge_id: string) {
  await apiClient.initializeCsrfProtection()
  return apiClient.post<{ data: PasswordChallenge; message: string }>('/api/v1/auth/password/forgot/resend', { email, challenge_id })
}

export async function confirmPasswordReset(input: {
  email: string
  challenge_id: string
  code: string
  password: string
  password_confirmation: string
}) {
  await apiClient.initializeCsrfProtection()
  await apiClient.post('/api/v1/auth/password/reset', input)
}
