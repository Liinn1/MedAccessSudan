import { apiRequest, setApiBearerToken } from '@/api/client'
import type { AuthenticatedUser } from '@/types/auth'

type AuthenticationResponse = { data: { user: AuthenticatedUser; token?: string } }
type RegistrationResponse = AuthenticationResponse & { account_created: true; verification_email_sent: boolean; code?: 'ACCOUNT_CREATED_BUT_VERIFICATION_EMAIL_FAILED' }
export type RegistrationResult = { user: AuthenticatedUser; verificationEmailSent: boolean }

export interface PatientRegistrationInput {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
}

type PasswordChallengeResponse = { data: { challenge_id: string; expires_in: number }; message: string }
export type PasswordChangeChallenge = { challenge_id: string; expires_in: number }
export interface RegistrationOption { code: string; name_en: string; name_ar: string }
export interface MobileImageFile { uri: string; name: string; type: string }
export interface DoctorRegistrationInput extends PatientRegistrationInput {
  specialization: string; location: string; address: string; clinic_name?: string
  offers_clinic_visits: boolean; offers_home_visits: boolean; profile_photo: MobileImageFile
}
export interface LaboratoryRegistrationInput {
  laboratory_name: string; email: string; phone: string; password: string; password_confirmation: string
  location: string; address: string; supports_at_lab: boolean
  supports_home_collection: boolean; profile_photo?: MobileImageFile
}

export async function restoreAuthenticatedUser(token: string): Promise<AuthenticatedUser> {
  setApiBearerToken(token)
  const response = await apiRequest<AuthenticationResponse>('/api/v1/auth/me')
  return response.data.user
}

export async function loginAccount(identifier: string, password: string) {
  const response = await apiRequest<AuthenticationResponse>('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, remember: true, device_name: 'medaccess-expo-mobile' }),
  })
  if (!response.data.token) throw new Error('The mobile login response did not include a session token.')
  setApiBearerToken(response.data.token)
  try {
    const user = await restoreAuthenticatedUser(response.data.token)
    if (user.role === 'admin' || user.role === 'super_admin') throw new Error('Administrative accounts must use the MedAccess web portal.')
    return { token: response.data.token, user }
  } catch (error) {
    await apiRequest('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined)
    setApiBearerToken(null)
    throw error
  }
}

export async function logoutPatient() {
  try {
    await apiRequest('/api/v1/auth/logout', { method: 'POST' })
  } finally {
    setApiBearerToken(null)
  }
}

export async function registerPatient(input: PatientRegistrationInput): Promise<RegistrationResult> {
  const response = await apiRequest<RegistrationResponse>('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    timeoutMs: 30000,
  })
  return { user: response.data.user, verificationEmailSent: response.verification_email_sent }
}

export async function resendEmailVerification(email: string) {
  await apiRequest('/api/v1/auth/email/verification-notification', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
  })
}

export async function getRegistrationOptions() {
  const response = await apiRequest<{ data: { specializations: RegistrationOption[]; locations: RegistrationOption[] } }>('/api/v1/auth/doctor-registration-options')
  return response.data
}

function registrationFormData(input: DoctorRegistrationInput | LaboratoryRegistrationInput) {
  const form = new FormData()
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue
    if (typeof value === 'object' && 'uri' in value) form.append(key, value as unknown as Blob)
    else if (typeof value === 'boolean') form.append(key, value ? '1' : '0')
    else form.append(key, String(value))
  }
  return form
}

async function registerProvider(path: string, input: DoctorRegistrationInput | LaboratoryRegistrationInput) {
  const response = await apiRequest<RegistrationResponse>(path, { method: 'POST', body: registrationFormData(input), timeoutMs: 30000 })
  return { user: response.data.user, verificationEmailSent: response.verification_email_sent }
}

export const registerDoctor = (input: DoctorRegistrationInput) => registerProvider('/api/v1/auth/register/doctor', input)
export const registerLaboratory = (input: LaboratoryRegistrationInput) => registerProvider('/api/v1/auth/register/laboratory', input)

export async function requestPasswordReset(email: string) {
  return apiRequest<PasswordChallengeResponse>('/api/v1/auth/password/forgot', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
  })
}

export async function resendPasswordReset(email: string, challengeId: string) {
  return apiRequest<PasswordChallengeResponse>('/api/v1/auth/password/forgot/resend', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, challenge_id: challengeId }),
  })
}

export async function completePasswordReset(input: {
  email: string; challenge_id: string; code: string; password: string; password_confirmation: string
}) {
  await apiRequest('/api/v1/auth/password/reset', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
}

export async function startPasswordChange(input: { current_password: string; password: string; password_confirmation: string }): Promise<PasswordChangeChallenge> {
  const response = await apiRequest<{ data: PasswordChangeChallenge }>('/api/v1/auth/password/change', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  return response.data
}

export async function confirmPasswordChange(challengeId: string, code: string) {
  await apiRequest('/api/v1/auth/password/change/confirm', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge_id: challengeId, code }),
  })
}
