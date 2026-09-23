import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ClinicVisitFrame } from '../../components/booking/ClinicVisitFrame'
import { DoctorResultCard } from '../../components/patient/DoctorResultCard'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ApiError } from '../../services/apiClient'
import { searchDoctors, type DoctorSummary } from '../../services/doctorService'
import { PatientLayout } from '../../layouts/PatientLayout'
import { saveClinicDoctorId, saveClinicSearchQuery } from '../../utils/clinicVisitNav'
import { buildLoginPath } from '../../utils/navigation'

export function DoctorSearchResultsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [doctors, setDoctors] = useState<DoctorSummary[]>([])
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const specialization = params.get('specialization') ?? ''
  const location = params.get('location') ?? ''
  const availability = params.get('availability') === 'week' ? 'week' : params.get('availability') === 'today' ? 'today' : undefined

  useEffect(() => {
    if (!specialization) {
      navigate('/patient/doctors/search', { replace: true })
      return
    }
    saveClinicSearchQuery(params.toString())
    const controller = new AbortController()
    let active = true
    searchDoctors({ specialization, location: location || undefined, availability, service_type: 'clinic' }, controller.signal)
      .then((response) => {
        if (!active) return
        setDoctors(response.data.doctors)
        setState('success')
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          navigate(buildLoginPath(`/patient/doctors/results?${params.toString()}`), { replace: true })
        } else {
          setState('error')
        }
      })
    return () => { active = false; controller.abort() }
  }, [attempt, availability, location, navigate, params, specialization])

  return (
    <PatientLayout activeSection="book">
      <ClinicVisitFrame step="doctors">
        {state === 'loading' ? <LoadingState contained message={t('patient.searchResults.loading')} /> : state === 'error' ? <ErrorState contained message={t('patient.searchResults.error')} retryLabel={t('patient.home.retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} /> : doctors.length ? (
          <div className="mt-6">
            <p className="mb-4 text-sm font-semibold text-[var(--color-text-secondary)]">{t('patient.searchResults.found', { count: doctors.length })}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {doctors.map((doctor, index) => (
                <div className="service-card-enter" key={doctor.id} style={{ animationDelay: `${index * 70}ms` }}>
                  <DoctorResultCard doctor={doctor} onViewProfile={() => { saveClinicDoctorId(doctor.id); navigate(`/patient/doctors/${doctor.id}`) }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold">{t('patient.searchResults.emptyTitle')}</h2>
            <p className="mt-2 text-[var(--color-text-secondary)]">{t('patient.searchResults.emptyDescription')}</p>
            <button className="mt-6 rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white" onClick={() => navigate('/patient/doctors/search')} type="button">{t('patient.searchResults.changeFilters')}</button>
          </div>
        )}
      </ClinicVisitFrame>
    </PatientLayout>
  )
}
