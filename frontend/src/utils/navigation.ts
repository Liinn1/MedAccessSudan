export const PATIENT_DEFAULT_ROUTE = '/patient/home'
export const APPOINTMENT_SEARCH_ROUTE = '/patient/doctors/search'
export const DOCTOR_DASHBOARD_ROUTE = '/doctor/dashboard'
export const ADMIN_DASHBOARD_ROUTE = '/admin/dashboard'

export function buildDoctorBookingPath(doctorId: number | string): string {
  return `/patient/doctors/${doctorId}/book`
}

export function buildLoginPath(destination: string): string {
  return `/login?redirect=${encodeURIComponent(destination)}`
}

export function getSafeRedirect(search: string, fallback = PATIENT_DEFAULT_ROUTE): string {
  const destination = new URLSearchParams(search).get('redirect')

  if (!destination || !destination.startsWith('/') || destination.startsWith('//')) {
    return fallback
  }

  return destination
}
