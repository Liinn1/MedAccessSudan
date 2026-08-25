import { apiClient } from './apiClient'

export interface SchedulePeriod { id?: number; day_of_week: number; start_time: string; end_time: string; slot_duration_minutes: number; is_active?: boolean }
export interface AvailabilityException { id: number; exception_date: string; type: 'unavailable' | 'modified' | 'blocked'; start_time: string | null; end_time: string | null }
export interface ExceptionInput { exception_date: string; type: AvailabilityException['type']; start_time?: string | null; end_time?: string | null }
export interface ResolvedDate { date: string; slots: { starts_at: string; ends_at: string }[] }

export async function getDoctorSchedule(signal?: AbortSignal) { return (await apiClient.get<{ data: { periods: SchedulePeriod[]; exceptions: AvailabilityException[] } }>('/api/v1/doctor/schedule', signal)).data }
export async function replaceDoctorSchedule(periods: SchedulePeriod[]) { await apiClient.initializeCsrfProtection(); return (await apiClient.put<{ data: { periods: SchedulePeriod[]; exceptions: AvailabilityException[] } }>('/api/v1/doctor/schedule', { periods })).data }
export async function createAvailabilityException(input: ExceptionInput) { await apiClient.initializeCsrfProtection(); return (await apiClient.post<{ data: AvailabilityException }>('/api/v1/doctor/schedule/exceptions', input)).data }
export async function updateAvailabilityException(id: number, input: ExceptionInput) { await apiClient.initializeCsrfProtection(); return (await apiClient.put<{ data: AvailabilityException }>(`/api/v1/doctor/schedule/exceptions/${id}`, input)).data }
export async function deleteAvailabilityException(id: number) { await apiClient.initializeCsrfProtection(); await apiClient.delete(`/api/v1/doctor/schedule/exceptions/${id}`) }
export async function getResolvedDoctorAvailability(signal?: AbortSignal) { return (await apiClient.get<{ data: { timezone: string; dates: ResolvedDate[] } }>('/api/v1/doctor/resolved-availability', signal)).data }
