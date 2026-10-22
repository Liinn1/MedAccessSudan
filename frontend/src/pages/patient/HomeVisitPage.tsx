import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { localizedName } from '../../utils/localizedName'
import { useNavigate } from 'react-router-dom'
import { BookingFlowFrame } from '../../components/booking/BookingFlowFrame'
import { BookingPanel } from '../../components/booking/BookingPanel'
import { BookingPaymentSummary } from '../../components/booking/BookingPaymentSummary'
import { BookingReviewList } from '../../components/booking/BookingReviewList'
import { BookingSlotPicker } from '../../components/booking/BookingSlotPicker'
import { PatientHomeAddressForm } from '../../components/booking/PatientHomeAddressForm'
import { createEmptyHomeAddress, type PatientHomeAddress } from '../../utils/homeAddress'
import { PaymentMethodSelector } from '../../components/booking/PaymentMethodSelector'
import { ProfileAvatar } from '../../components/branding/ProfileAvatar'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LocationMapPreview } from '../../components/patient/LocationMapPreview'
import { ProviderRatingSummary } from '../../components/ratings/ProviderRatingSummary'
import { useBookingStepFocus } from '../../hooks/useBookingStepFocus'
import { useHomeGeolocation } from '../../hooks/useHomeGeolocation'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { getPatientHome } from '../../services/authService'
import { getDoctorFilters, getDoctorProfile, searchDoctors, type DoctorAvailabilitySlot, type DoctorFilterOption, type DoctorProfile, type DoctorSummary } from '../../services/doctorService'
import { bookPatientAppointment } from '../../services/patientAppointmentService'
import type { ServicePayment } from '../../services/paymentTypes'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { buildLoginPath } from '../../utils/navigation'
import { useBookingPayment } from '../../hooks/useBookingPayment'

type Step = 'search' | 'doctors' | 'details' | 'review' | 'success'

export function HomeVisitPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('search')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [specializations, setSpecializations] = useState<DoctorFilterOption[]>([])
  const [cities, setCities] = useState<DoctorFilterOption[]>([])
  const [specialization, setSpecialization] = useState('')
  const [city, setCity] = useState('')
  const [doctors, setDoctors] = useState<DoctorSummary[]>([])
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
  const [slot, setSlot] = useState<DoctorAvailabilitySlot | null>(null)
  const [address, setAddress] = useState<PatientHomeAddress>(createEmptyHomeAddress())
  const { captureLocation, coordinates, locating, locationError, setLocationError } = useHomeGeolocation()
  const [appointmentId, setAppointmentId] = useState<number | null>(null)
  const [createdPayment, setCreatedPayment] = useState<ServicePayment | null>(null)
  const payment = useBookingPayment()
  const headingRef = useBookingStepFocus(step)
  const arabic = i18n.resolvedLanguage === 'ar'
  const locale = arabic ? 'ar-SD' : 'en'

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getDoctorFilters(controller.signal), getPatientHome(controller.signal)])
      .then(([filters, user]) => {
        setSpecializations(filters.specializations)
        setCities(filters.locations)
        setSpecialization(filters.specializations[0]?.code ?? '')
        setAddress((value) => ({ ...value, contact_phone: user.phone ?? value.contact_phone }))
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

  const optionLabel = (option: DoctorFilterOption) => localizedName(option, i18n.resolvedLanguage)
  const selectedSpecialty = specializations.find((item) => item.code === specialization)
  const selectedCity = cities.find((item) => item.code === city)
  const formattedSlot = useMemo(() => slot ? {
    date: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: SUDAN_TIME_ZONE }).format(new Date(slot.starts_at)),
    time: new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: SUDAN_TIME_ZONE }).format(new Date(slot.starts_at)),
  } : null, [locale, slot])

  async function findDoctors(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    if (!city) { setError(t('patient.homeVisit.cityRequired')); setBusy(false); return }
    try { const result = await searchDoctors({ specialization, location: city, service_type: 'home_visit', availability: 'week' }); setDoctors(result.data.doctors); setStep('doctors') }
    catch { setError(t('patient.homeVisit.searchError')) }
    finally { setBusy(false) }
  }

  async function chooseDoctor(summary: DoctorSummary) {
    setBusy(true); setError('')
    try { setDoctor(await getDoctorProfile(summary.id, undefined, 'home_visit')); setSlot(null); setStep('details') }
    catch { setError(t('patient.homeVisit.doctorError')) }
    finally { setBusy(false) }
  }

  function review(event: FormEvent) {
    event.preventDefault()
    if (!slot) { setError(t('patient.homeVisit.slotRequired')); return }
    if (!coordinates) { setLocationError(t('patient.homeVisit.locationRequired')); return }
    setError(''); setStep('review')
  }

  async function confirm() {
    if (!doctor || !slot || !coordinates || busy) return
    if (!payment.validate(t)) return
    setBusy(true); setError('')
    try {
      const appointment = await bookPatientAppointment({
        doctor_profile_id: doctor.id,
        starts_at: slot.starts_at,
        service_type: 'home_visit',
        ...payment.payload(),
        home_visit: {
          contact_phone: address.contact_phone.replace(/[\s\-()]/g, ''),
          city,
          area: address.area.trim(),
          address_details: address.address_details.trim(),
          additional_directions: address.additional_directions.trim() || null,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
      })
      setCreatedPayment(appointment.payment ?? null)
      setAppointmentId(appointment.id); setStep('success')
    } catch (cause) { setError(t(cause instanceof ApiError && cause.status === 409 ? 'patient.homeVisit.slotUnavailable' : 'patient.homeVisit.bookingError')) }
    finally { setBusy(false) }
  }

  if (loading) return <PatientLayout activeSection="homeVisit"><LoadingState contained message={t('patient.homeVisit.loading')} /></PatientLayout>
  if (!specializations.length) return <PatientLayout activeSection="homeVisit"><ErrorState contained message={error || t('patient.homeVisit.loadError')} onRetry={() => window.location.reload()} retryLabel={t('patient.home.retry')} /></PatientLayout>

  const progressSteps = ['search', 'doctors', 'details', 'review'] as const
  const currentIndex = step === 'success' ? 3 : progressSteps.indexOf(step)

  return <PatientLayout activeSection="homeVisit"><BookingFlowFrame
    ariaLabel={t('patient.homeVisit.progress')}
    currentIndex={currentIndex}
    description={t('patient.homeVisit.description')}
    eyebrow={t('patient.homeVisit.eyebrow')}
    steps={progressSteps.map((item, index) => ({ id: item, label: t(`patient.homeVisit.steps.${item}`), onSelect: step !== 'success' && index < currentIndex ? () => setStep(item) : undefined }))}
    title={t('patient.homeVisit.title')}
  >
    {step === 'search' && <BookingPanel onSubmit={findDoctors}><h2 className="sr-only" ref={headingRef} tabIndex={-1}>{t('patient.homeVisit.steps.search')}</h2><div className="grid gap-5 sm:grid-cols-2"><label className="font-bold">{t('patient.homeVisit.specialty')}<select className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4" onChange={(event) => setSpecialization(event.target.value)} value={specialization}>{specializations.map((item) => <option key={item.code} value={item.code}>{optionLabel(item)}</option>)}</select></label><label className="font-bold">{t('patient.homeVisit.city')} *<select className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4" onChange={(event) => setCity(event.target.value)} required value={city}><option value="">{t('patient.homeVisit.selectCity')}</option>{cities.map((item) => <option key={item.code} value={item.code}>{optionLabel(item)}</option>)}</select></label></div><button className="mt-6 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-5 font-bold text-white disabled:opacity-60" disabled={busy} type="submit">{t(busy ? 'patient.homeVisit.searching' : 'patient.homeVisit.findDoctors')}</button></BookingPanel>}

    {step === 'doctors' && <section className="mt-6"><button className="mb-4 font-bold text-[var(--color-primary)]" onClick={() => setStep('search')}>← {t('patient.homeVisit.back')}</button><h2 className="sr-only" ref={headingRef} tabIndex={-1}>{t('patient.homeVisit.steps.doctors')}</h2>{doctors.length ? <div className="grid gap-4 md:grid-cols-2">{doctors.map((item) => <article className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm" key={item.id}><div className="flex items-center gap-3"><ProfileAvatar className="size-14 shrink-0 rounded-full text-base" imageUrl={item.profile_image_url} name={item.name} /><div><h2 className="font-extrabold">{item.name}</h2><p className="text-sm text-[var(--color-text-secondary)]">{optionLabel(item.specialization)}</p><ProviderRatingSummary className="mt-1" rating={item} /></div></div><button className="mt-4 w-full rounded-full bg-[var(--color-primary)] px-4 py-2.5 font-bold text-white" disabled={busy} onClick={() => chooseDoctor(item)}>{t('patient.homeVisit.selectDoctor')}</button></article>)}</div> : <div className="rounded-3xl border border-dashed bg-white p-8 text-center">{t('patient.homeVisit.noDoctors')}</div>}</section>}

    {step === 'details' && doctor && <BookingPanel className="grid gap-5" onSubmit={review}>
      <button className="w-fit font-bold text-[var(--color-primary)]" onClick={() => setStep('doctors')} type="button">← {t('patient.homeVisit.back')}</button>
      <section>
        <h2 className="text-xl font-extrabold" ref={headingRef} tabIndex={-1}>{doctor.name}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{optionLabel(doctor.specialization)}</p>
        <ProviderRatingSummary className="mt-1" rating={doctor} />
      </section>
      <BookingSlotPicker
        emptyLabel={t('patient.homeVisit.noSlots')}
        locale={locale}
        onSelect={(picked) => setSlot(doctor.availability.find((item) => item.starts_at === picked.starts_at) ?? null)}
        selectedStartsAt={slot?.starts_at}
        slots={doctor.availability.map((item) => ({ starts_at: item.starts_at, timeZone: SUDAN_TIME_ZONE }))}
        title={t('patient.homeVisit.availableTimes')}
      />
      <PatientHomeAddressForm
        address={address}
        cityName={selectedCity ? optionLabel(selectedCity) : ''}
        coordinates={coordinates}
        locating={locating}
        locationError={locationError}
        onCaptureLocation={captureLocation}
        onChange={setAddress}
        onChangeCity={() => { setDoctor(null); setSlot(null); setStep('search') }}
        requireCoordinates
        showContactPhone
        title={t('patient.homeVisit.visitAddress')}
      />
      <button className="min-h-12 rounded-full bg-[var(--color-primary)] px-5 font-bold text-white" type="submit">{t('patient.homeVisit.review')}</button>
    </BookingPanel>}

    {step === 'review' && doctor && slot && formattedSlot && coordinates && <BookingPanel>
      <button className="font-bold text-[var(--color-primary)]" onClick={() => setStep('details')} type="button">← {t('patient.homeVisit.edit')}</button>
      <h2 className="mt-4 text-2xl font-extrabold" ref={headingRef} tabIndex={-1}>{t('patient.homeVisit.reviewTitle')}</h2>
      <BookingReviewList rows={[
        { label: t('patient.homeVisit.doctor'), value: doctor.name },
        { label: t('patient.homeVisit.specialty'), value: selectedSpecialty ? optionLabel(selectedSpecialty) : '' },
        { label: t('patient.homeVisit.visitType'), value: t('patient.homeVisit.homeVisit') },
        { label: t('patient.homeVisit.city'), value: selectedCity ? optionLabel(selectedCity) : '' },
        { label: t('patient.homeVisit.date'), value: formattedSlot.date },
        { label: t('patient.homeVisit.time'), value: formattedSlot.time, ltr: true },
        { label: t('patient.homeVisit.fields.contact_phone'), value: address.contact_phone },
      ]} />
      <h3 className="mt-5 text-lg font-extrabold">{t('patient.homeVisit.visitLocation')}</h3>
      <LocationMapPreview className="mt-3" latitude={coordinates.latitude} longitude={coordinates.longitude} />
      <BookingReviewList rows={[
        { label: t('patient.homeVisit.fields.area'), value: address.area },
        { label: t('patient.homeVisit.fields.address_details'), value: address.address_details },
        ...(address.additional_directions ? [{ label: t('patient.homeVisit.fields.additional_directions'), value: address.additional_directions }] : []),
      ]} />
      <PaymentMethodSelector card={payment.card} errors={payment.errors} method={payment.method} onCardChange={payment.setCard} onMethodChange={payment.setMethod} />
      <button className="mt-6 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-5 font-bold text-white disabled:opacity-60" disabled={busy} onClick={confirm} type="button">{t(busy ? 'patient.homeVisit.confirming' : 'patient.homeVisit.confirm')}</button>
    </BookingPanel>}
    {step === 'success' && appointmentId && <BookingPanel className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-700">✓</span><h2 className="mt-4 text-3xl font-extrabold" ref={headingRef} tabIndex={-1}>{t('patient.homeVisit.successTitle')}</h2><p className="mt-2 text-[var(--color-text-secondary)]">{t('patient.homeVisit.successDescription')}</p><BookingPaymentSummary payment={createdPayment} /><button className="mt-6 rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white" onClick={() => navigate(`/patient/appointments/${appointmentId}`)} type="button">{t('patient.homeVisit.viewAppointment')}</button></BookingPanel>}
    <p aria-live="polite" className="mt-4 min-h-6 text-center font-semibold text-red-700">{error}</p>
  </BookingFlowFrame></PatientLayout>
}
