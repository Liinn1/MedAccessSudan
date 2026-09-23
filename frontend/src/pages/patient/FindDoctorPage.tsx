import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { SelectField } from '../../components/forms/SelectField'
import { ChevronIcon, LocationIcon, SearchIcon } from '../../components/icons/PatientHomeIcons'
import { ApiError } from '../../services/apiClient'
import { getDoctorFilters, searchDoctors, type DoctorFilterOption } from '../../services/doctorService'
import { PatientLayout } from '../../layouts/PatientLayout'
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
  const [isSearching, setIsSearching] = useState(false)

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setIsSearching(true)
    try {
      await searchDoctors({ specialization, location: location || undefined, availability: availability || undefined })
      const query = new URLSearchParams({ specialization })
      if (location) query.set('location', location)
      if (availability) query.set('availability', availability)
      navigate(`/patient/doctors/results?${query}`)
    } catch (error: unknown) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        navigate(buildLoginPath('/patient/doctors/search'), { replace: true })
      } else {
        setNotice(t('patient.findDoctor.searchError'))
      }
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <PatientLayout activeSection="book">
      <div className="px-5 py-8 sm:px-8 sm:py-12">
      <section className="mx-auto flex min-h-[36rem] w-full max-w-3xl flex-col rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <header className="flex items-center justify-between gap-3">
          <button aria-label={t('patient.findDoctor.back')} className="grid size-12 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" onClick={() => navigate('/patient/home')} type="button">
            <ChevronIcon className="size-6 rtl:rotate-180" />
          </button>
          <h1 className="min-w-0 flex-1 text-center text-2xl font-extrabold text-[var(--color-text-primary)] sm:text-3xl">{t('patient.findDoctor.title')}</h1>
          <span aria-hidden="true" className="size-12" />
        </header>

        <form className="mt-10 flex flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="space-y-7">
            <SelectField disabled={isLoadingFilters} id="doctor-specialization" icon={<SearchIcon className="size-6" />} label={t('patient.findDoctor.specialization')} onChange={(event) => setSpecialization(event.target.value)} options={specializations.map((option) => ({ value: option.code, label: optionLabel(option) }))} value={specialization} />

            <SelectField disabled={isLoadingFilters} id="doctor-location" icon={<LocationIcon className="size-6" />} label={t('patient.findDoctor.location')} onChange={(event) => setLocation(event.target.value)} options={[{ value: '', label: t('patient.findDoctor.allLocations') }, ...locations.map((option) => ({ value: option.code, label: optionLabel(option) }))]} value={location} />

            <fieldset>
              <legend className="mb-3 text-base font-semibold text-[var(--color-text-secondary)] sm:text-lg">{t('patient.findDoctor.availability')}</legend>
              <div className="flex flex-wrap gap-3">
                {(['today', 'week'] as const).map((value) => (
                  <button aria-pressed={availability === value} className={`min-h-12 rounded-full border px-5 text-base transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${availability === value ? 'border-[var(--color-primary)] bg-[var(--color-primary-surface)] font-bold text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)]'}`} key={value} onClick={() => setAvailability(value)} type="button">{t(`patient.findDoctor.availabilityOptions.${value}`)}</button>
                ))}
              </div>
            </fieldset>
          </div>

          <p aria-live="polite" className="mt-6 min-h-6 text-center text-sm font-medium text-[var(--color-primary)]">{notice}</p>
          <button className="mt-auto flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[var(--color-primary)] px-6 py-3 text-lg font-bold text-white transition hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoadingFilters || isSearching || !specialization} type="submit"><SearchIcon className="size-6" />{t(isSearching ? 'patient.findDoctor.searching' : 'patient.findDoctor.search')}</button>
        </form>
      </section>
      </div>
    </PatientLayout>
  )
}
