import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LocationIcon } from '../../components/icons/PatientHomeIcons'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { getPatientHome } from '../../services/authService'
import { getDoctorFilters, getDoctorProfile, searchDoctors, type DoctorAvailabilitySlot, type DoctorFilterOption, type DoctorProfile, type DoctorSummary } from '../../services/doctorService'
import { bookPatientAppointment } from '../../services/patientAppointmentService'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { buildLoginPath } from '../../utils/navigation'

type Step = 'search' | 'doctors' | 'details' | 'review' | 'success'
type Address = { contact_phone: string; area: string; address_details: string; additional_directions: string }
type Coordinates = { latitude: number; longitude: number; accuracy: number }

const emptyAddress: Address = { contact_phone: '', area: '', address_details: '', additional_directions: '' }

export function HomeVisitPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('search')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [specializations, setSpecializations] = useState<DoctorFilterOption[]>([])
  const [specialization, setSpecialization] = useState('')
  const [doctors, setDoctors] = useState<DoctorSummary[]>([])
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
  const [slot, setSlot] = useState<DoctorAvailabilitySlot | null>(null)
  const [address, setAddress] = useState<Address>(emptyAddress)
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [appointmentId, setAppointmentId] = useState<number | null>(null)
  const arabic = i18n.resolvedLanguage === 'ar'
  const locale = arabic ? 'ar-SD' : 'en'

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getDoctorFilters(controller.signal), getPatientHome(controller.signal)])
      .then(([filters, user]) => {
        setSpecializations(filters.specializations)
        setSpecialization(filters.specializations[0]?.code ?? '')
        setAddress((value) => ({ ...value, contact_phone: user.phone ?? '' }))
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof ApiError && [401, 403].includes(cause.status)) navigate(buildLoginPath('/patient/home-visits'), { replace: true })
        else setError(t('patient.homeVisit.loadError'))
        setLoading(false)
      })
    return () => controller.abort()
  }, [navigate, t])

  const optionLabel = (option: DoctorFilterOption) => arabic ? option.name_ar : option.name_en
  const selectedSpecialty = specializations.find((item) => item.code === specialization)
  const formattedSlot = useMemo(() => slot ? {
    date: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: SUDAN_TIME_ZONE }).format(new Date(slot.starts_at)),
    time: new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: SUDAN_TIME_ZONE }).format(new Date(slot.starts_at)),
  } : null, [locale, slot])

  async function findDoctors(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { const result = await searchDoctors({ specialization, service_type: 'home_visit', availability: 'week' }); setDoctors(result.data.doctors); setStep('doctors') }
    catch { setError(t('patient.homeVisit.searchError')) }
    finally { setBusy(false) }
  }

  async function chooseDoctor(summary: DoctorSummary) {
    setBusy(true); setError('')
    try { setDoctor(await getDoctorProfile(summary.id, undefined, 'home_visit')); setSlot(null); setStep('details') }
    catch { setError(t('patient.homeVisit.doctorError')) }
    finally { setBusy(false) }
  }

  function captureLocation() {
    setLocationError('')
    if (!navigator.geolocation) { setLocationError(t('patient.homeVisit.locationErrors.unavailable')); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setCoordinates({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }); setLocating(false) },
      (cause) => {
        const key = cause.code === cause.PERMISSION_DENIED ? 'denied' : cause.code === cause.POSITION_UNAVAILABLE ? 'unavailable' : cause.code === cause.TIMEOUT ? 'timeout' : 'generic'
        setLocationError(t(`patient.homeVisit.locationErrors.${key}`)); setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  function review(event: FormEvent) {
    event.preventDefault()
    if (!slot) { setError(t('patient.homeVisit.slotRequired')); return }
    if (!coordinates) { setLocationError(t('patient.homeVisit.locationRequired')); return }
    setError(''); setStep('review')
  }

  async function confirm() {
    if (!doctor || !slot || !coordinates || busy) return
    setBusy(true); setError('')
    try {
      const appointment = await bookPatientAppointment({
        doctor_profile_id: doctor.id,
        starts_at: slot.starts_at,
        service_type: 'home_visit',
        home_visit: {
          contact_phone: address.contact_phone.replace(/[\s\-()]/g, ''),
          area: address.area.trim(),
          address_details: address.address_details.trim(),
          additional_directions: address.additional_directions.trim() || null,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
      })
      setAppointmentId(appointment.id); setStep('success')
    } catch (cause) { setError(t(cause instanceof ApiError && cause.status === 409 ? 'patient.homeVisit.slotUnavailable' : 'patient.homeVisit.bookingError')) }
    finally { setBusy(false) }
  }

  const updateAddress = (key: keyof Address, value: string) => setAddress((current) => ({ ...current, [key]: value }))
  if (loading) return <PatientLayout activeSection="homeVisit"><LoadingState contained message={t('patient.homeVisit.loading')} /></PatientLayout>
  if (!specializations.length) return <PatientLayout activeSection="homeVisit"><ErrorState contained message={error || t('patient.homeVisit.loadError')} onRetry={() => window.location.reload()} retryLabel={t('patient.home.retry')} /></PatientLayout>

  return <PatientLayout activeSection="homeVisit"><div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
    <header className="rounded-3xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white p-6 rtl:bg-gradient-to-l sm:p-8"><p className="font-bold text-amber-700">{t('patient.homeVisit.eyebrow')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('patient.homeVisit.title')}</h1><p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('patient.homeVisit.description')}</p></header>
    <ol className="mt-5 grid grid-cols-4 gap-2" aria-label={t('patient.homeVisit.progress')}>{(['search','doctors','details','review'] as const).map((item, index) => <li className={`rounded-full px-2 py-2 text-center text-xs font-bold sm:text-sm ${(['search','doctors','details','review','success'].indexOf(step) >= index) ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-200 text-slate-500'}`} key={item}>{t(`patient.homeVisit.steps.${item}`)}</li>)}</ol>

    {step === 'search' && <form className="mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8" onSubmit={findDoctors}><label className="font-bold">{t('patient.homeVisit.specialty')}<select className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4" onChange={(event) => setSpecialization(event.target.value)} value={specialization}>{specializations.map((item) => <option key={item.code} value={item.code}>{optionLabel(item)}</option>)}</select></label><button className="mt-6 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-5 font-bold text-white disabled:opacity-60" disabled={busy} type="submit">{t(busy ? 'patient.homeVisit.searching' : 'patient.homeVisit.findDoctors')}</button></form>}

    {step === 'doctors' && <section className="mt-6"><button className="mb-4 font-bold text-[var(--color-primary)]" onClick={() => setStep('search')}>← {t('patient.homeVisit.back')}</button>{doctors.length ? <div className="grid gap-4 md:grid-cols-2">{doctors.map((item) => <article className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm" key={item.id}><div className="flex items-center gap-3">{item.profile_image_url ? <img alt="" className="size-14 rounded-full object-cover" src={item.profile_image_url}/> : <span className="grid size-14 place-items-center rounded-full bg-[var(--color-primary-surface)] font-black text-[var(--color-primary)]">{item.name[0]}</span>}<div><h2 className="font-extrabold">{item.name}</h2><p className="text-sm text-[var(--color-text-secondary)]">{optionLabel(item.specialization)}</p></div></div><button className="mt-4 w-full rounded-full bg-[var(--color-primary)] px-4 py-2.5 font-bold text-white" disabled={busy} onClick={() => chooseDoctor(item)}>{t('patient.homeVisit.selectDoctor')}</button></article>)}</div> : <div className="rounded-3xl border border-dashed bg-white p-8 text-center">{t('patient.homeVisit.noDoctors')}</div>}</section>}

    {step === 'details' && doctor && <form className="mt-6 grid gap-5 rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8" onSubmit={review}>
      <button className="w-fit font-bold text-[var(--color-primary)]" onClick={() => setStep('doctors')} type="button">← {t('patient.homeVisit.back')}</button>
      <section><h2 className="text-xl font-extrabold">{doctor.name}</h2><p className="text-sm text-[var(--color-text-secondary)]">{optionLabel(doctor.specialization)}</p><h3 className="mt-5 font-extrabold">{t('patient.homeVisit.availableTimes')}</h3><div className="mt-3 flex flex-wrap gap-2">{doctor.availability.map((item) => <button aria-pressed={slot?.id === item.id} className={`rounded-xl border px-3 py-2 text-sm font-bold ${slot?.id === item.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)]'}`} key={item.id} onClick={() => setSlot(item)} type="button">{new Intl.DateTimeFormat(locale, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:SUDAN_TIME_ZONE }).format(new Date(item.starts_at))}</button>)}</div>{!doctor.availability.length && <p className="mt-3 text-sm text-red-700">{t('patient.homeVisit.noSlots')}</p>}</section>
      <h3 className="text-xl font-extrabold">{t('patient.homeVisit.visitAddress')}</h3>
      <section className={`rounded-2xl border p-4 ${coordinates ? 'border-emerald-200 bg-emerald-50' : 'border-teal-100 bg-[var(--color-primary-surface)]'}`}><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white text-[var(--color-primary)]"><LocationIcon className="size-6" /></span><div><p className="font-extrabold">{t(coordinates ? 'patient.homeVisit.locationCaptured' : 'patient.homeVisit.useLocation')}</p>{coordinates && <p className="text-sm text-emerald-800">{t('patient.homeVisit.locationProvided')}</p>}</div></div><button className="min-h-11 rounded-full border border-[var(--color-primary)] bg-white px-5 font-bold text-[var(--color-primary)] disabled:opacity-60" disabled={locating} onClick={captureLocation} type="button">{t(locating ? 'patient.homeVisit.gettingLocation' : coordinates ? 'patient.homeVisit.updateLocation' : 'patient.homeVisit.useLocation')}</button></div><p aria-live="polite" className="mt-2 min-h-5 text-sm font-semibold text-red-700">{locationError}</p></section>
      <div className="grid gap-4 sm:grid-cols-2"><label className="font-semibold">{t('patient.homeVisit.fields.contact_phone')} *<input className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--color-border)] px-4" maxLength={30} onChange={(event) => updateAddress('contact_phone', event.target.value)} required type="tel" value={address.contact_phone}/></label><label className="font-semibold">{t('patient.homeVisit.fields.area')} *<input className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--color-border)] px-4" maxLength={255} onChange={(event) => updateAddress('area', event.target.value)} placeholder={t('patient.homeVisit.placeholders.area')} required value={address.area}/></label></div>
      <label className="font-semibold">{t('patient.homeVisit.fields.address_details')} *<textarea className="mt-2 block min-h-24 w-full rounded-xl border border-[var(--color-border)] px-4 py-3" maxLength={500} onChange={(event) => updateAddress('address_details', event.target.value)} placeholder={t('patient.homeVisit.placeholders.address_details')} required value={address.address_details}/></label>
      <label className="font-semibold">{t('patient.homeVisit.fields.additional_directions')}<textarea className="mt-2 block min-h-20 w-full rounded-xl border border-[var(--color-border)] px-4 py-3" maxLength={2000} onChange={(event) => updateAddress('additional_directions', event.target.value)} placeholder={t('patient.homeVisit.placeholders.additional_directions')} value={address.additional_directions}/></label>
      <button className="min-h-12 rounded-full bg-[var(--color-primary)] px-5 font-bold text-white" type="submit">{t('patient.homeVisit.review')}</button>
    </form>}

    {step === 'review' && doctor && slot && formattedSlot && <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8"><button className="font-bold text-[var(--color-primary)]" onClick={() => setStep('details')}>← {t('patient.homeVisit.edit')}</button><h2 className="mt-4 text-2xl font-extrabold">{t('patient.homeVisit.reviewTitle')}</h2><dl className="mt-5 divide-y divide-slate-100">{[[t('patient.homeVisit.doctor'),doctor.name],[t('patient.homeVisit.specialty'),selectedSpecialty ? optionLabel(selectedSpecialty) : ''],[t('patient.homeVisit.visitType'),t('patient.homeVisit.homeVisit')],[t('patient.homeVisit.date'),formattedSlot.date],[t('patient.homeVisit.time'),formattedSlot.time],[t('patient.homeVisit.locationProvided'),t('patient.homeVisit.locationCaptured')],[t('patient.homeVisit.fields.contact_phone'),address.contact_phone],[t('patient.homeVisit.fields.area'),address.area],[t('patient.homeVisit.fields.address_details'),address.address_details],...(address.additional_directions ? [[t('patient.homeVisit.fields.additional_directions'),address.additional_directions]] : [])].map(([label,value]) => <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]" key={label}><dt className="font-bold text-[var(--color-text-secondary)]">{label}</dt><dd>{value}</dd></div>)}</dl><button className="mt-6 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-5 font-bold text-white disabled:opacity-60" disabled={busy} onClick={confirm}>{t(busy ? 'patient.homeVisit.confirming' : 'patient.homeVisit.confirm')}</button></section>}
    {step === 'success' && appointmentId && <section className="mt-6 rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm"><span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-700">✓</span><h2 className="mt-4 text-3xl font-extrabold">{t('patient.homeVisit.successTitle')}</h2><p className="mt-2 text-[var(--color-text-secondary)]">{t('patient.homeVisit.successDescription')}</p><button className="mt-6 rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white" onClick={() => navigate(`/patient/appointments/${appointmentId}`)}>{t('patient.homeVisit.viewAppointment')}</button></section>}
    <p aria-live="polite" className="mt-4 min-h-6 text-center font-semibold text-red-700">{error}</p>
  </div></PatientLayout>
}
