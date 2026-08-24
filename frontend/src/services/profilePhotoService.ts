import { apiClient } from './apiClient'
import type { AuthenticatedUser } from './authService'

function photoForm(file: File) { const form = new FormData(); form.append('profile_photo', file); return form }

export async function updatePatientProfilePhoto(file: File): Promise<AuthenticatedUser> { await apiClient.initializeCsrfProtection(); return (await apiClient.postForm<{ data: { user: AuthenticatedUser } }>('/api/v1/patient/profile-photo', photoForm(file))).data.user }
export async function removePatientProfilePhoto(): Promise<AuthenticatedUser> { await apiClient.initializeCsrfProtection(); return (await apiClient.delete<{ data: { user: AuthenticatedUser } }>('/api/v1/patient/profile-photo')).data.user }
export async function updateDoctorProfilePhoto(file: File): Promise<string> { await apiClient.initializeCsrfProtection(); return (await apiClient.postForm<{ data: { profile_image_url: string } }>('/api/v1/doctor/profile-photo', photoForm(file))).data.profile_image_url }
