export type PatientNavSection = 'dashboard' | 'book' | 'homeVisit' | 'appointments' | 'laboratory' | 'profile' | 'none'

/**
 * Exact route matching so /patient/home does not activate Home Visit,
 * and /patient/laboratory does not activate any other service.
 */
export function resolvePatientNavSection(pathname: string): PatientNavSection {
  if (pathname.startsWith('/patient/home-visits')) return 'homeVisit'
  if (pathname === '/patient/home' || pathname === '/patient/home/') return 'dashboard'
  if (pathname.startsWith('/patient/appointments/confirm')) return 'book'
  if (pathname.startsWith('/patient/appointments')) return 'appointments'
  if (pathname.startsWith('/patient/doctors')) return 'book'
  if (pathname === '/patient/laboratory' || pathname === '/patient/laboratory/') return 'laboratory'
  if (pathname.startsWith('/patient/laboratory/orders')) return 'appointments'
  if (pathname.startsWith('/patient/lab-results')) return 'none'
  if (pathname.startsWith('/patient/profile')) return 'profile'
  return 'dashboard'
}
