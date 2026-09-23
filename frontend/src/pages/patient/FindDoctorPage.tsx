import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookingPanel } from '../../components/booking/BookingPanel'
import { ClinicVisitFrame } from '../../components/booking/ClinicVisitFrame'
import { ApiError } from '../../services/apiClient'
import { getDoctorFilters, type DoctorFilterOption } from '../../services/doctorService'
import { PatientLayout } from '../../layouts/PatientLayout'
import { saveClinicSearchQuery } from '../../utils/clinicVisitNav'
import { buildLoginPath } from '../../utils/navigation'

type Availability = '' | 'today' | 'week'

export function FindDoctorPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [specialization, setSpecialization] = useState('general_medicine')
  const [location, setLocation] = useState('')
  const [availability, setAvailability] = useState<Availability>('')
  const [notice, setNotice] = useState('')
  const [specializations, setSpecializations] = useState<DoctorFilterOption[]>([])
  const [locations, setLocations] = useState<DoctorFilterOption[]>([])
  const [isLoadingFilters, setIsLoadingFilters] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    getDoctorFilters(controller.signal)
      .then((filters) => {
        if (!active) return
        setSpecializations(filters.specializations)
        setLocations(filters.locations)
        setSpecialization(filters.specializations[0]?.code ?? '')
        setLocation('')
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          navigate(buildLoginPath('/patient/doctors/search'), { replace: true })
          return
        }
        setNotice(t('patient.findDoctor.filtersError'))
      })
      .finally(() => { if (active) setIsLoadingFilters(false) })

    return () => { active = false; controller.abort() }
  }, [navigate, t])

  const optionLabel = (option: DoctorFilterOption) => i18n.resolvedLanguage === 'ar' ? option.name_ar : option.name_en

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!specialization) return
    const query = new URLSearchParams({ specialization })
    if (location) query.set('location', location)
    if (availability) query.set('availability', availability)
    saveClinicSearchQuery(query.toString())
    navigate(`/patient/doctors/results?${query}`)
  }

  return (
    <PatientLayout activeSection="book">
      <ClinicVisitFrame step="search">
        <BookingPanel onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="font-bold">{t('patient.findDoctor.specialization')} *
              <select className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4" disabled={isLoadingFilters} id="doctor-specialization" onChange={(event) => setSpecialization(event.target.value)} required value={specialization}>
                {specializations.map((option) => <option key={option.code} value={option.code}>{optionLabel(option)}</option>)}
              </select>
            </label>
            <label className="font-bold">{t('patient.findDoctor.location')}
              <select className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4" disabled={isLoadingFilters} id="doctor-location" onChange={(event) => setLocation(event.target.value)} value={location}>
                <option value="">{t('patient.findDoctor.allLocations')}</option>
                {locations.map((option) => <option key={option.code} value={option.code}>{optionLabel(option)}</option>)}
              </select>
            </label>
          </div>
          <fieldset className="mt-5">
            <legend className="mb-3 font-bold">{t('patient.findDoctor.availability')}</legend>
            <div className="flex flex-wrap gap-3">
              {(['today', 'week'] as const).map((value) => (
                <button aria-pressed={availability === value} className={`min-h-12 rounded-full border px-5 font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${availability === value ? 'border-[var(--color-primary)] bg-[var(--color-primary-surface)] text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]'}`} key={value} onClick={() => setAvailability((current) => current === value ? '' : value)} type="button">{t(`patient.findDoctor.availabilityOptions.${value}`)}</button>
              ))}
            </div>
          </fieldset>
          <p aria-live="polite" className="mt-6 min-h-6 text-center text-sm font-medium text-red-700">{notice}</p>
          <button className="mt-2 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-5 font-bold text-white disabled:opacity-60" disabled={isLoadingFilters || !specialization} type="submit">{t('patient.findDoctor.search')}</button>
        </BookingPanel>
      </ClinicVisitFrame>
    </PatientLayout>
  )
}
