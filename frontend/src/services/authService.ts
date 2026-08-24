import { apiClient } from './apiClient'

export type UserRole = 'patient' | 'doctor' | 'administrator'

export interface AuthenticatedUser {
  id: number
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  role: UserRole
}

interface AuthenticationResponse {
  data: {
    user: AuthenticatedUser
  }
  message?: string
}

/**
 * Starts a CSRF-protected Laravel Sanctum session using an email or phone
 * identifier. The session cookie is HTTP-only and is never stored in React.
 */
export async function login(identifier: string, password: string): Promise<AuthenticatedUser> {
  await apiClient.initializeCsrfProtection()
  const response = await apiClient.post<AuthenticationResponse>('/api/v1/auth/login', {
    identifier,
    password,
  })

  return response.data.user
}

/** Reads the protected identity resource to restore an existing SPA session. */
export async function getCurrentUser(signal?: AbortSignal): Promise<AuthenticatedUser> {
  const response = await apiClient.get<AuthenticationResponse>('/api/v1/auth/me', signal)
  return response.data.user
}

/** Loads the patient-only home resource, enforcing the role at the API boundary. */
export async function getPatientHome(signal?: AbortSignal): Promise<AuthenticatedUser> {
  const response = await apiClient.get<AuthenticationResponse>('/api/v1/patient/home', signal)
  return response.data.user
}

/** Ends the server session; no authentication material is retained by React. */
export async function logout(): Promise<void> {
  await apiClient.initializeCsrfProtection()
  await apiClient.post('/api/v1/auth/logout')
}

export interface PatientRegistrationInput {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
}

/** Creates a patient identity; the backend assigns the role and hashes the password. */
export async function registerPatient(input: PatientRegistrationInput): Promise<AuthenticatedUser> {
  await apiClient.initializeCsrfProtection()
  const response = await apiClient.post<AuthenticationResponse>('/api/v1/auth/register', input)
  return response.data.user
}
