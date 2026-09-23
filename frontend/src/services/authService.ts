import { apiClient, ApiError } from './apiClient'

export type UserRole = 'patient' | 'doctor' | 'admin' | 'super_admin'

export interface AuthenticatedUser {
  id: number
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  role: UserRole
  profile_image_url: string | null
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
 * Callers must redirect using the returned user's stored role.
 */
export async function login(identifier: string, password: string): Promise<AuthenticatedUser> {
  await apiClient.initializeCsrfProtection()
  const response = await apiClient.post<AuthenticationResponse>('/api/v1/auth/login', {
    identifier,
    password,
  })
  const user = response.data?.user

  if (!user?.role) {
    throw new ApiError('The login response did not include an authenticated user.', 500, response)
  }

  return user
}

export async function loginAdmin(identifier: string, password: string): Promise<AuthenticatedUser> {
  await apiClient.initializeCsrfProtection()
  const response = await apiClient.post<AuthenticationResponse>('/api/v1/admin/login', { identifier, password })
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
  profile_photo?: File | null
}

/** Creates a patient identity; the backend assigns the role and hashes the password. */
export async function registerPatient(input: PatientRegistrationInput): Promise<AuthenticatedUser> {
  await apiClient.initializeCsrfProtection()
  const form = registrationFormData(input)
  const response = await apiClient.postForm<AuthenticationResponse>('/api/v1/auth/register', form)
  return response.data.user
}

export interface DoctorRegistrationInput extends PatientRegistrationInput {
  specialization: string
  location?: string
  proposed_city?: string
  clinic_name: string
  offers_clinic_visits: boolean
  offers_home_visits: boolean
  profile_photo: File
}

export interface RegistrationOption { code: string; name_en: string; name_ar: string }

export async function getDoctorRegistrationOptions(signal?: AbortSignal) {
  const response = await apiClient.get<{ data: { specializations: RegistrationOption[]; locations: RegistrationOption[] } }>('/api/v1/auth/doctor-registration-options', signal)
  return response.data
}

export async function registerDoctor(input: DoctorRegistrationInput): Promise<AuthenticatedUser> {
  await apiClient.initializeCsrfProtection()
  const response = await apiClient.postForm<AuthenticationResponse>('/api/v1/auth/register/doctor', registrationFormData(input))
  return response.data.user
}

function registrationFormData(input: PatientRegistrationInput | DoctorRegistrationInput): FormData {
  const form = new FormData()
  Object.entries(input).forEach(([key, value]) => {
    if (value instanceof File) form.append(key, value)
    else if (typeof value === 'boolean') form.append(key, value ? '1' : '0')
    else if (value !== undefined && value !== null) form.append(key, String(value))
  })
  return form
}
