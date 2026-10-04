import type { AuthenticatedUser } from '../services/authService'
import type { DoctorDashboardProfile } from '../services/doctorDashboardService'
import type { LaboratoryProfilePayload } from '../services/laboratoryService'
import type { ProviderVerificationPayload } from '../services/providerVerificationService'

export type CompletionItemKey = 'basicInformation' | 'contactInformation' | 'profilePicture' | 'specialty' | 'location' | 'professionalBio' | 'clinic' | 'weeklyAvailability' | 'laboratoryDetails' | 'verificationDocuments' | 'laboratoryTests'
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

export function laboratoryProfileCompletion(
  user: AuthenticatedUser,
  profile: LaboratoryProfilePayload,
  verification: ProviderVerificationPayload | null,
  testsOffered: number,
): ProfileCompletionResult {
  return calculate([
    { key: 'laboratoryDetails', complete: present(profile.name) && present(profile.address) },
    { key: 'contactInformation', complete: present(user.email) && present(profile.phone ?? user.phone) },
    { key: 'profilePicture', complete: present(profile.profile_image_url) },
    { key: 'location', complete: Boolean(profile.location) },
    { key: 'verificationDocuments', complete: Boolean(verification && verification.required_count > 0 && verification.submitted_count >= verification.required_count) },
    { key: 'laboratoryTests', complete: testsOffered > 0 },
  ])
}
