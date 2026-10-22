import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import checkupsImage from '../../assets/public-home/clinic-visits.jpg'
import hydrationImage from '../../assets/home-carousel/medical-technology.jpg'
import movementImage from '../../assets/public-home/home-visits.jpg'
import { DashboardFeatureCarousel } from '../../components/dashboard/DashboardFeatureCarousel'
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState'
import { DashboardGreeting } from '../../components/dashboard/DashboardGreeting'
import { DashboardHomeCard, DashboardHomeGrid } from '../../components/dashboard/DashboardHomeCard'
import { DashboardInfoCard } from '../../components/dashboard/DashboardInfoCard'
import { DashboardPage } from '../../components/dashboard/DashboardPage'
import { DashboardProfileCard } from '../../components/dashboard/DashboardProfileCard'
import { DashboardQuickActionCard } from '../../components/dashboard/DashboardQuickActionCard'
import { DashboardSectionCard, DashboardSplit } from '../../components/dashboard/DashboardSectionCard'
import { DashboardServices } from '../../components/dashboard/DashboardServices'
import { ErrorState } from '../../components/feedback/ErrorState'
import { InformationDialog } from '../../components/feedback/InformationDialog'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, LaboratoryIcon, MailIcon, PhoneIcon, StethoscopeIcon, VisitIcon } from '../../components/icons/PatientHomeIcons'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { getPatientHome, logout, type AuthenticatedUser } from '../../services/authService'
import { downloadLaboratoryResult, getPatientLaboratoryOrders, openLaboratoryResult, type LaboratoryOrder } from '../../services/laboratoryService'
import { getPatientUpcomingBookings, type PatientUpcomingBooking } from '../../services/patientAppointmentService'
import { greetingPeriod, SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { buildLoginPath } from '../../utils/navigation'

const services = [
  { key: 'findDoctor', path: '/patient/doctors/search', accent: 'bg-[var(--color-primary-surface)] text-[var(--color-primary)]', icon: StethoscopeIcon },
  { key: 'homeVisit', path: '/patient/home-visits', accent: 'bg-amber-100 text-amber-600', icon: VisitIcon },
  { key: 'laboratory', path: '/patient/laboratory', accent: 'bg-sky-100 text-sky-600', icon: LaboratoryIcon },
  { key: 'appointments', path: '/patient/appointments', accent: 'bg-slate-100 text-slate-700', icon: CalendarIcon },
] as const

const healthTips = [
  { key: 'checkups', image: checkupsImage, route: '/patient/doctors/search' },
  { key: 'hydration', image: hydrationImage, route: '/patient/home' },
  { key: 'movement', image: movementImage, route: '/patient/home' },
] as const

export function PatientHomePage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [futureFeature, setFutureFeature] = useState('')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [upcomingBookings, setUpcomingBookings] = useState<PatientUpcomingBooking[]>([])
  const [labOrders, setLabOrders] = useState<LaboratoryOrder[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getPatientHome(controller.signal), getPatientUpcomingBookings(controller.signal), getPatientLaboratoryOrders(controller.signal)])
      .then(([authenticatedUser, patientUpcomingBookings, patientLabOrders]) => {
        setUser(authenticatedUser)
        setUpcomingBookings(patientUpcomingBookings)
        setLabOrders(patientLabOrders)
        setLoadState('success')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate(buildLoginPath('/patient/home'), { replace: true })
        else setLoadState('error')
      })
    return () => controller.abort()
  }, [loadAttempt, navigate])

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setFutureFeature(t('patient.home.logoutError'))
      setIsLoggingOut(false)
    }
  }

  if (loadState === 'loading') return <PatientLayout><LoadingState contained message={t('patient.dashboard.loading')} /></PatientLayout>
  if (loadState === 'error' || !user) return <PatientLayout><ErrorState contained message={t('patient.dashboard.loadError')} onRetry={() => { setLoadState('loading'); setLoadAttempt((attempt) => attempt + 1) }} retryLabel={t('patient.home.retry')} /></PatientLayout>

  const firstName = user.first_name || user.name.split(' ')[0] || user.name
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-SD' : 'en'
  const arabic = i18n.language.startsWith('ar')
  const viewAll = (path: string) => <button className="shrink-0 text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate(path)} type="button">{t('patient.dashboard.viewAll')}</button>

  return (
    <PatientLayout isLoggingOut={isLoggingOut} onAppointments={() => navigate('/patient/appointments')} onDashboard={() => navigate('/patient/home')} onLogout={handleLogout} onProfile={() => navigate('/patient/profile')} user={user}>
      <DashboardPage>
        <DashboardGreeting aside={t('patient.dashboard.healthMessage')} description={t('patient.dashboard.supportingText')} greeting={t(`patient.dashboard.greetings.${greetingPeriod()}`, { name: firstName })} />

        <DashboardHomeGrid>
          <DashboardProfileCard editLabel={t('patient.dashboard.editProfile')} imageUrl={user.profile_image_url} name={user.name} onEdit={() => navigate('/patient/profile')} role={t('roles.patient')} />
          <DashboardInfoCard
            editLabel={t('patient.dashboard.edit')}
            onEdit={() => navigate('/patient/profile')}
            rows={[
              { icon: <MailIcon className="size-5" />, label: t('patient.dashboard.email'), value: user.email },
              { icon: <PhoneIcon className="size-5" />, label: t('patient.dashboard.phone'), value: user.phone || '—' },
            ]}
            title={t('patient.dashboard.personalInformation')}
          />
          <DashboardHomeCard action={viewAll('/patient/appointments')} icon={<CalendarIcon className="size-5 text-[var(--color-primary)]" />} title={t('patient.dashboard.upcomingAppointments')}>
            {upcomingBookings.length === 0 ? <DashboardEmptyState action={<button className="text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/patient/doctors/search')} type="button">{t('patient.dashboard.bookAppointment')}</button>} description={t('patient.dashboard.noUpcomingDescription')} title={t('patient.dashboard.noUpcomingTitle')} /> : <ul className="space-y-2.5">{upcomingBookings.slice(0, 4).map((booking) => {
              if (booking.type === 'laboratory') {
                const order = booking.laboratory_order
                const tests = (order.items ?? []).map((item) => item.short_name || (arabic ? item.name_ar : item.name_en)).join(', ')
                return <li key={`lab-${order.id}`}><button className="flex w-full flex-col gap-1 rounded-2xl border border-[var(--color-border)] p-3.5 text-start hover:border-teal-200" onClick={() => navigate(`/patient/laboratory/orders/${order.id}`)} type="button"><span className="flex flex-wrap items-start justify-between gap-2"><strong>{order.laboratory_name}</strong><LaboratoryStatusBadge namespace="patient.laboratory.statuses" status={order.status} /></span><span className="text-sm text-[var(--color-text-secondary)]">{tests} · {t(`patient.laboratory.collectionMethods.${order.collection_method ?? 'at_lab'}`)}</span><span className="direction-ltr text-start text-xs font-semibold text-[var(--color-text-secondary)]">{new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(booking.scheduled_at))}</span></button></li>
              }
              const appointment = booking.appointment
              const specialty = arabic ? appointment.doctor.specialization.name_ar : appointment.doctor.specialization.name_en
              return <li key={`visit-${appointment.id}`}><button className="flex w-full flex-col gap-1 rounded-2xl border border-[var(--color-border)] p-3.5 text-start hover:border-teal-200" onClick={() => navigate(`/patient/appointments/${appointment.id}`)} type="button"><span className="flex flex-wrap items-start justify-between gap-2"><strong>{appointment.doctor.name}</strong><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">{t(`patient.appointments.statuses.${appointment.status}`)}</span></span><span className="text-sm text-[var(--color-text-secondary)]">{specialty} · {t(`patient.appointments.services.${appointment.service_type}`)}</span><span className="direction-ltr text-start text-xs font-semibold text-[var(--color-text-secondary)]">{new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(booking.scheduled_at))}</span></button></li>
            })}</ul>}
          </DashboardHomeCard>
        </DashboardHomeGrid>

        <DashboardServices title={t('patient.dashboard.servicesTitle')}>
          {services.map(({ key, path, accent, icon: Icon }) => <DashboardQuickActionCard accentClassName={accent} description={t(`patient.dashboard.serviceDescriptions.${key}`)} icon={<Icon className="size-5" />} key={key} label={t(`patient.home.services.${key}`)} onSelect={() => navigate(path)} />)}
        </DashboardServices>

        <DashboardSplit>
          <DashboardSectionCard action={viewAll('/patient/appointments')} title={t('patient.dashboard.laboratory.title')}>
            {labOrders.length === 0 ? <DashboardEmptyState description={t('patient.dashboard.laboratory.emptyDescription')} icon={LaboratoryIcon} title={t('patient.dashboard.laboratory.emptyTitle')} /> : <ul className="space-y-2.5">{labOrders.slice(0, 4).map((order) => <li className="rounded-2xl border border-[var(--color-border)] p-3.5" key={order.id}>
              <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-extrabold" dir="auto">{(order.items ?? []).map((item) => arabic ? item.name_ar : item.name_en).join(', ')}</p><LaboratoryStatusBadge namespace="patient.laboratory.statuses" status={order.status} /></div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{order.laboratory_name}</p>
              {order.status === 'result_ready' && order.result && <div className="mt-2 flex flex-wrap gap-3"><button className="text-sm font-bold text-[var(--color-primary)]" onClick={() => openLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{t('patient.laboratory.view')}</button><button className="text-sm font-bold text-[var(--color-primary)]" onClick={() => downloadLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{t('patient.laboratory.download')}</button></div>}
            </li>)}</ul>}
          </DashboardSectionCard>
          <DashboardFeatureCarousel
            carouselDescription={t('patient.dashboard.healthTips.carousel')}
            carouselLabel={t('patient.dashboard.healthTips.carouselLabel')}
            isRtl={i18n.dir() === 'rtl'}
            nextLabel={t('patient.dashboard.healthTips.next')}
            paginationLabel={t('patient.dashboard.healthTips.pagination')}
            previousLabel={t('patient.dashboard.healthTips.previous')}
            slideLabel={(number) => t('patient.dashboard.healthTips.goToSlide', { number })}
            slides={healthTips.map((tip) => ({ id: tip.key, image: tip.image, label: t('patient.dashboard.healthTips.label'), title: t(`patient.dashboard.healthTips.titles.${tip.key}`), description: t(`patient.dashboard.healthTips.items.${tip.key}`), cta: t(`patient.dashboard.healthTips.actions.${tip.key}`), to: tip.route }))}
            title={t('patient.dashboard.healthTips.title')}
          />
        </DashboardSplit>
      </DashboardPage>
      <InformationDialog closeLabel={t('publicHome.footer.comingSoonClose')} description={futureFeature === t('patient.home.logoutError') ? futureFeature : t('publicHome.footer.comingSoonDescription', { feature: futureFeature })} onClose={() => setFutureFeature('')} open={Boolean(futureFeature)} title={futureFeature || t('publicHome.comingSoon')} />
    </PatientLayout>
  )
}
