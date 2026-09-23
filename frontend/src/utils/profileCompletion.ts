import type { AuthenticatedUser } from '../services/authService'
import type { DoctorDashboardProfile } from '../services/doctorDashboardService'

export type CompletionItemKey = 'basicInformation' | 'contactInformation' | 'profilePicture' | 'specialty' | 'location' | 'professionalBio' | 'clinic' | 'weeklyAvailability'
export interface ProfileCompletionResult { completed: number; total: number; percentage: number; missing: CompletionItemKey[] }

// Completion is a readiness hint only. Provider verification remains an
// administrator-controlled backend status and must never be inferred here.
function calculate(items: { key: CompletionItemKey; complete: boolean }[]): ProfileCompletionResult {
  const completed = items.filter((item) => item.complete).length
  return { completed, total: items.length, percentage: Math.round((completed / items.length) * 100), missing: items.filter((item) => !item.complete).map((item) => item.key) }
}

const present = (value: string | null | undefined) => Boolean(value?.trim())

export function patientProfileCompletion(user: AuthenticatedUser): ProfileCompletionResult {
  return calculate([
    { key: 'basicInformation', complete: present(user.first_name) && present(user.last_name) },
    { key: 'contactInformation', complete: present(user.email) && present(user.phone) },
    { key: 'profilePicture', complete: present(user.profile_image_url) },
  ])
}

export function doctorProfileCompletion(user: AuthenticatedUser, profile: DoctorDashboardProfile): ProfileCompletionResult {
  return calculate([
    { key: 'basicInformation', complete: present(user.first_name) && present(user.last_name) },
    { key: 'contactInformation', complete: present(user.email) && present(user.phone) },
    { key: 'profilePicture', complete: present(profile.profile_image_url) },
    { key: 'specialty', complete: Boolean(profile.specialization) },
    { key: 'location', complete: Boolean(profile.location) },
    { key: 'professionalBio', complete: present(profile.biography) },
    { key: 'clinic', complete: !profile.offers_clinic_visits || present(profile.clinic_name) },
    { key: 'weeklyAvailability', complete: profile.has_weekly_availability },
  ])
}
