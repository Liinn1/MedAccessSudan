import type { UserRole } from '../services/authService'

export const PATIENT_DEFAULT_ROUTE = '/patient/home'
export const APPOINTMENT_SEARCH_ROUTE = '/patient/doctors/search'
export const DOCTOR_DASHBOARD_ROUTE = '/doctor/dashboard'
export const ADMIN_DASHBOARD_ROUTE = '/admin/dashboard'
/** Reserved for future institutional/service-provider accounts. Not doctor login. */
export const PROVIDER_LOGIN_ROUTE = '/login/provider'

export function getDashboardRoute(role: UserRole): string {
  if (role === 'doctor') return DOCTOR_DASHBOARD_ROUTE
  if (role === 'patient') return PATIENT_DEFAULT_ROUTE
  return ADMIN_DASHBOARD_ROUTE
}

export function buildLoginPath(destination: string): string {
  return `/login?redirect=${encodeURIComponent(destination)}`
}

function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//')
}

/**
 * Post-login destination for the unified /login page.
 * Only patients and doctors use this page. Admin accounts stay on /admin/login.
 */
export function getAuthenticatedDestination(role: string, search = ''): string | null {
  if (role !== 'patient' && role !== 'doctor') return null

  const fallback = role === 'doctor' ? DOCTOR_DASHBOARD_ROUTE : PATIENT_DEFAULT_ROUTE
  const destination = new URLSearchParams(search).get('redirect')

  if (!destination || !isSafeInternalPath(destination)) return fallback
  if (role === 'doctor' && (destination === '/doctor' || destination.startsWith('/doctor/'))) return destination
  if (role === 'patient' && (destination === '/patient' || destination.startsWith('/patient/'))) return destination

  return fallback
}

export function getSafeRedirect(search: string, fallback = PATIENT_DEFAULT_ROUTE): string {
  const destination = new URLSearchParams(search).get('redirect')

  if (!destination || !isSafeInternalPath(destination)) {
    return fallback
  }

  return destination
}
