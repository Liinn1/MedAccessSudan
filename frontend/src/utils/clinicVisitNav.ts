const searchKey = 'medaccess.clinicSearchQuery'
const doctorKey = 'medaccess.clinicDoctorId'

export function saveClinicSearchQuery(query: string): void {
  sessionStorage.setItem(searchKey, query)
}

export function saveClinicDoctorId(doctorId: number): void {
  sessionStorage.setItem(doctorKey, String(doctorId))
}

export function clinicResultsPath(): string {
  const query = sessionStorage.getItem(searchKey)
  return query ? `/patient/doctors/results?${query}` : '/patient/doctors/search'
}

export function clinicDoctorPath(): string {
  const doctorId = sessionStorage.getItem(doctorKey)
  return doctorId ? `/patient/doctors/${doctorId}` : clinicResultsPath()
}
