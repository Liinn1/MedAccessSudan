import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookingHero } from '../../components/booking/BookingHero'
import { BookingPanel } from '../../components/booking/BookingPanel'
import { paymentMethodLabel } from '../../components/booking/BookingPaymentSummary'
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, LaboratoryIcon, StethoscopeIcon, VisitIcon } from '../../components/icons/PatientHomeIcons'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
import { PatientAppointmentCard } from '../../components/patient/PatientAppointmentCard'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { logout } from '../../services/authService'
import { getPatientLaboratoryOrders, openLaboratoryResult, type LaboratoryOrder } from '../../services/laboratoryService'
import { getPatientAppointments, type PatientAppointment } from '../../services/patientAppointmentService'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { buildLoginPath } from '../../utils/navigation'

type LoadState = 'loading' | 'success' | 'error'
type ServiceFilter = 'all' | 'clinic' | 'home_visit' | 'laboratory'
type UnifiedItem =
  | { kind: 'clinic' | 'home_visit'; sortAt: number; appointment: PatientAppointment }
  | { kind: 'laboratory'; sortAt: number; order: LaboratoryOrder }

const filters: ServiceFilter[] = ['all', 'clinic', 'home_visit', 'laboratory']

export function PatientAppointmentsPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [labOrders, setLabOrders] = useState<LaboratoryOrder[]>([])
  const [filter, setFilter] = useState<ServiceFilter>('all')
  const [state, setState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)
  const arabic = i18n.resolvedLanguage === 'ar'
  const locale = arabic ? 'ar-SD' : 'en'

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getPatientAppointments(controller.signal), getPatientLaboratoryOrders(controller.signal)])
      .then(([doctorAppointments, orders]) => {
        setAppointments(doctorAppointments)
        setLabOrders(orders)
        setState('success')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate(buildLoginPath('/patient/appointments'), { replace: true })
        else setState('error')
      })
    return () => controller.abort()
  }, [attempt, navigate])

  const items = useMemo(() => {
    const doctorItems: UnifiedItem[] = appointments.map((appointment) => ({
      kind: appointment.service_type === 'home_visit' ? 'home_visit' : 'clinic',
      sortAt: new Date(appointment.starts_at).getTime(),
      appointment,
    }))
    const laboratoryItems: UnifiedItem[] = labOrders.map((order) => ({
      kind: 'laboratory',
      sortAt: new Date(order.requested_at).getTime(),
      order,
    }))
    return [...doctorItems, ...laboratoryItems]
      .filter((item) => filter === 'all' || item.kind === filter)
      .sort((a, b) => b.sortAt - a.sortAt)
  }, [appointments, filter, labOrders])

  async function signOut() {
    setLoggingOut(true)
    try { await logout(); navigate('/login', { replace: true }) } catch { setLoggingOut(false) }
  }

  if (state === 'loading') return <PatientLayout activeSection="appointments"><LoadingState contained message={t('patient.appointments.loading')} /></PatientLayout>
  if (state === 'error') return <PatientLayout activeSection="appointments"><ErrorState contained message={t('patient.appointments.error')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('patient.home.retry')} /></PatientLayout>

  return <PatientLayout activeSection="appointments" isLoggingOut={loggingOut} onAppointments={() => undefined} onDashboard={() => navigate('/patient/home')} onLogout={signOut} onProfile={() => navigate('/patient/profile')}>
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
      <BookingHero description={t('patient.appointments.description')} eyebrow={t('patient.appointments.eyebrow')} title={t('patient.appointments.title')} />
      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button className={`rounded-full px-4 py-2 text-sm font-bold ${filter === item ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] bg-white'}`} key={item} onClick={() => setFilter(item)} type="button">{t(`patient.appointments.filters.${item}`)}</button>
        ))}
      </div>
      {items.length === 0 ? <BookingPanel><DashboardEmptyState action={<EmptyActions filter={filter} />} description={t(`patient.appointments.empty.${filter}`)} icon={CalendarIcon} title={t(`patient.appointments.emptyTitle.${filter}`)} /></BookingPanel> : <ul className="mt-6 grid gap-4 md:grid-cols-2">{items.map((item) => item.kind === 'laboratory' ? <li key={`lab-${item.order.id}`}><LabCard locale={locale} order={item.order} /></li> : <li key={`visit-${item.appointment.id}`}><VisitCard appointment={item.appointment} locale={locale} /></li>)}</ul>}
    </div>
  </PatientLayout>
}

function EmptyActions({ filter }: { filter: ServiceFilter }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const outline = 'rounded-full border border-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-primary)]'
  const filled = 'rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white'
  const clinic = <button className={filled} onClick={() => navigate('/patient/doctors/search')} type="button">{t('patient.navigation.book')}</button>
  const home = <button className={filter === 'all' ? outline : filled} onClick={() => navigate('/patient/home-visits')} type="button">{t('patient.navigation.homeVisit')}</button>
  const lab = <button className={filter === 'all' ? outline : filled} onClick={() => navigate('/patient/laboratory')} type="button">{t('patient.navigation.laboratory')}</button>
  return <div className="flex flex-wrap justify-center gap-2">{filter === 'all' ? <>{clinic}{home}{lab}</> : filter === 'clinic' ? clinic : filter === 'home_visit' ? home : lab}</div>
}

function typeBadge(kind: 'clinic' | 'home_visit' | 'laboratory', t: (key: string) => string) {
  const Icon = kind === 'laboratory' ? LaboratoryIcon : kind === 'home_visit' ? VisitIcon : StethoscopeIcon
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-surface)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]"><Icon className="size-3.5" />{t(`patient.appointments.types.${kind}`)}</span>
}

function VisitCard({ appointment, locale }: { appointment: PatientAppointment; locale: string }) {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const start = new Date(appointment.starts_at)
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: SUDAN_TIME_ZONE }).format(start)
  const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: SUDAN_TIME_ZONE }).format(start)
  const specialty = i18n.resolvedLanguage === 'ar' ? appointment.doctor.specialization.name_ar : appointment.doctor.specialization.name_en
  const reviewAction = appointment.status === 'completed'
  const kind = appointment.service_type === 'home_visit' ? 'home_visit' : 'clinic'
  const place = kind === 'home_visit'
    ? [appointment.home_visit?.area, appointment.home_visit?.address_details].filter(Boolean).join(' — ')
    : [appointment.doctor.clinic_name, i18n.resolvedLanguage === 'ar' ? appointment.doctor.location?.name_ar : appointment.doctor.location?.name_en].filter(Boolean).join(' — ')
  return <PatientAppointmentCard
    actions={<button className="w-full rounded-full border border-[var(--color-primary)] px-4 py-2.5 font-bold text-[var(--color-primary)]" onClick={() => navigate(reviewAction ? `/patient/appointments/${appointment.id}/review` : `/patient/appointments/${appointment.id}`)} type="button">{t(reviewAction ? appointment.review ? 'patient.appointments.viewReview' : 'patient.appointments.rateDoctor' : 'patient.appointments.viewDetails')}</button>}
    location={place}
    meta={[
      { label: t('patient.appointments.date'), value: date },
      { label: t('patient.appointments.time'), value: time, ltr: true },
    ]}
    payment={paymentMethodLabel(appointment.payment, t)}
    paymentLabel={t('patient.payment.statusLabel')}
    status={<span className={`rounded-full px-3 py-1 text-xs font-bold ${appointment.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-[var(--color-success-surface)] text-emerald-800'}`}>{t(`patient.appointments.statuses.${appointment.status}`)}</span>}
    subtitle={specialty}
    title={appointment.doctor.name}
    typeBadge={typeBadge(kind, t)}
  />
}

function LabCard({ locale, order }: { locale: string; order: LaboratoryOrder }) {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const arabic = i18n.resolvedLanguage === 'ar'
  const items = order.items ?? []
  const first = items[0] ? (items[0].short_name || (arabic ? items[0].name_ar : items[0].name_en)) : ''
  const tests = items.length > 2 ? t('patient.appointments.moreTests', { name: first, count: items.length - 1 }) : items.map((item) => item.short_name || (arabic ? item.name_ar : item.name_en)).join(' + ')
  const location = [order.location ? (arabic ? order.location.name_ar : order.location.name_en) : '', order.address].filter(Boolean).join(' — ')
  const ready = order.status === 'result_ready' && order.result
  return <PatientAppointmentCard
    actions={<>
      <button className="w-full rounded-full border border-[var(--color-primary)] px-4 py-2.5 font-bold text-[var(--color-primary)]" onClick={() => navigate(`/patient/laboratory/orders/${order.id}`)} type="button">{t('patient.appointments.viewDetails')}</button>
      {ready && <button className="w-full rounded-full bg-[var(--color-primary)] px-4 py-2.5 font-bold text-white" onClick={() => openLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{t('patient.laboratory.view')}</button>}
    </>}
    location={location}
    meta={[{ label: t('patient.appointments.date'), value: new Date(order.requested_at).toLocaleDateString(locale) }]}
    payment={paymentMethodLabel(order.payment, t)}
    paymentLabel={t('patient.payment.statusLabel')}
    status={<LaboratoryStatusBadge namespace="patient.laboratory.statuses" status={order.status} />}
    subtitle={tests}
    title={order.laboratory_name}
    typeBadge={typeBadge('laboratory', t)}
  />
}
