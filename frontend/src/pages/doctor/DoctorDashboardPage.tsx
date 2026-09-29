import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppointmentOverviewChart, SlotUtilizationChart } from '../../components/charts/DoctorDashboardCharts'
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState'
import { DashboardGreeting } from '../../components/dashboard/DashboardGreeting'
import { DashboardHomeCard, DashboardHomeGrid } from '../../components/dashboard/DashboardHomeCard'
import { DashboardInfoCard } from '../../components/dashboard/DashboardInfoCard'
import { DashboardPage } from '../../components/dashboard/DashboardPage'
import { DashboardProfileCard } from '../../components/dashboard/DashboardProfileCard'
import { DashboardQuickActionCard } from '../../components/dashboard/DashboardQuickActionCard'
import { DashboardSectionCard, DashboardSplit } from '../../components/dashboard/DashboardSectionCard'
import { DashboardServices } from '../../components/dashboard/DashboardServices'
import { DoctorPracticeTipsCarousel } from '../../components/doctor/DoctorPracticeTipsCarousel'
import { DashboardVerificationNotice } from '../../components/verification/ProviderVerificationCard'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, ProfileIcon, StethoscopeIcon, VisitIcon } from '../../components/icons/PatientHomeIcons'
import { DoctorLayout } from '../../layouts/DoctorLayout'
import { ApiError } from '../../services/apiClient'
import { getCurrentUser, logout } from '../../services/authService'
import { CONSULTATION_TYPE, getDoctorDashboard, type ConsultationType, type DoctorDashboardData } from '../../services/doctorDashboardService'
import { greetingPeriod, sudanDateKey, SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { buildLoginPath, DOCTOR_DASHBOARD_ROUTE, PATIENT_DEFAULT_ROUTE } from '../../utils/navigation'

export function DoctorDashboardPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<DoctorDashboardData | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [notice, setNotice] = useState('')
  const [utilizationFilter, setUtilizationFilter] = useState<'all' | ConsultationType>('all')

  useEffect(() => {
    const controller = new AbortController()
    getDoctorDashboard(controller.signal).then((data) => { setDashboard(data); setLoadState('success') }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && error.status === 401) { navigate(buildLoginPath(DOCTOR_DASHBOARD_ROUTE), { replace: true }); return }
      if (error instanceof ApiError && error.status === 403) {
        getCurrentUser().then((user) => { if (user.role === 'patient') navigate(PATIENT_DEFAULT_ROUTE, { replace: true }); else setLoadState('error') }).catch(() => navigate('/login', { replace: true }))
        return
      }
      setLoadState('error')
    })
    return () => controller.abort()
  }, [loadAttempt, navigate])

  async function handleLogout() {
    setIsLoggingOut(true)
    setNotice('')
    try { await logout(); navigate('/login', { replace: true }) }
    catch { setNotice(t('doctor.dashboard.logoutError')); setIsLoggingOut(false) }
  }

  if (loadState === 'loading') return <DoctorLayout><LoadingState contained message={t('doctor.dashboard.loading')} /></DoctorLayout>
  if (loadState === 'error' || !dashboard) return <DoctorLayout><ErrorState contained message={t('doctor.dashboard.error')} onRetry={() => { setLoadState('loading'); setLoadAttempt((attempt) => attempt + 1) }} retryLabel={t('doctor.dashboard.retry')} /></DoctorLayout>

  const { profile, user, insights } = dashboard
  const locale = i18n.language.startsWith('ar') ? 'ar-SD' : 'en'
  const firstName = user.first_name || user.name.split(' ')[0] || user.name
  const specialty = profile?.specialization ? (i18n.language.startsWith('ar') ? profile.specialization.name_ar : profile.specialization.name_en) : t('doctor.dashboard.notProvided')
  const location = profile?.location ? (i18n.language.startsWith('ar') ? profile.location.name_ar : profile.location.name_en) : t('doctor.dashboard.notProvided')
  const weekdayLabels = [t('doctor.availability.days.0'), t('doctor.availability.days.1'), t('doctor.availability.days.2'), t('doctor.availability.days.3'), t('doctor.availability.days.4'), t('doctor.availability.days.5'), t('doctor.availability.days.6')]
  const chartDays = (insights?.appointment_overview.days ?? []).map((day) => ({ label: weekdayLabels[day.weekday]?.slice(0, 3) ?? day.date, completed: day.completed, upcoming: day.upcoming, cancelled: day.cancelled }))
  const totals = insights?.appointment_overview.totals ?? { total: 0, completed: 0, upcoming: 0, cancelled: 0 }
  const utilization = utilizationFilter === 'all' ? insights?.slot_utilization.all : insights?.slot_utilization.by_type[utilizationFilter]
  const formatSlot = (value?: string | null) => value ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(value)) : null
  const todayKey = sudanDateKey(new Date())
  const todayAppointments = (insights?.upcoming_appointments ?? []).filter((appointment) => sudanDateKey(new Date(appointment.starts_at)) === todayKey)
  const bothTypes = Boolean(profile?.offers_clinic_visits && profile?.offers_home_visits)
  const nextSlot = formatSlot(profile?.next_available?.clinic ?? profile?.next_available?.home_visit) ?? t('doctor.dashboard.noClinicSlots')
  const viewAll = <button className="shrink-0 text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/doctor/appointments')} type="button">{t('doctor.dashboard.viewAll')}</button>

  return (
    <DoctorLayout isLoggingOut={isLoggingOut} onLogout={handleLogout} roleLabel={specialty} user={{ ...user, profile_image_url: profile?.profile_image_url ?? user.profile_image_url }}>
      <DashboardPage>
        <DashboardGreeting aside={t('doctor.dashboard.healthMessage')} description={t('doctor.dashboard.supportingText')} greeting={t(`doctor.dashboard.greetings.${greetingPeriod()}`, { name: firstName })} />
        <DashboardVerificationNotice onOpen={() => navigate('/doctor/profile#account-verification')} role="doctor" status={profile?.verification_status} />

        <DashboardHomeGrid>
          <DashboardProfileCard editLabel={t('patient.dashboard.editProfile')} imageUrl={profile?.profile_image_url ?? user.profile_image_url} name={user.name} onEdit={() => navigate('/doctor/profile')} role={specialty} />
          <DashboardInfoCard
            editLabel={t('patient.dashboard.edit')}
            onEdit={() => navigate('/doctor/profile')}
            rows={[
              { label: t('doctor.dashboard.practiceTitle'), value: profile?.clinic_name || t('doctor.dashboard.notProvided') },
              { label: t('patient.doctorProfile.location'), value: location },
              { label: t('doctor.dashboard.availabilityCardTitle'), value: nextSlot },
            ]}
            title={t('doctor.dashboard.infoTitle')}
          />
          <DashboardHomeCard action={viewAll} icon={<CalendarIcon className="size-5 text-[var(--color-primary)]" />} title={t('doctor.dashboard.todaySchedule')}>
            {todayAppointments.length === 0 ? <DashboardEmptyState description={t('doctor.dashboard.noTodayHelp')} title={t('doctor.dashboard.noToday')} /> : <ul className="space-y-2.5">{todayAppointments.map((appointment) => (
              <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] p-3.5" key={appointment.id}>
                <div className="min-w-0"><p className="font-extrabold">{appointment.patient_name}</p><p className="text-sm text-[var(--color-text-secondary)]">{t(`doctor.appointments.services.${appointment.service_type}`)}</p></div>
                <div className="text-end text-sm"><p className="direction-ltr font-bold">{new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(appointment.starts_at))}</p><p className="text-[var(--color-text-secondary)]">{t(`doctor.appointments.statuses.${appointment.status}`)}</p></div>
              </li>
            ))}</ul>}
          </DashboardHomeCard>
        </DashboardHomeGrid>

        <DashboardServices title={t('doctor.dashboard.servicesTitle')}>
          <DashboardQuickActionCard accentClassName="bg-[var(--color-primary-surface)] text-[var(--color-primary)]" description={t('doctor.dashboard.manageAvailability')} icon={<StethoscopeIcon className="size-5" />} label={t('doctor.navigation.availability')} onSelect={() => navigate('/doctor/availability')} />
          <DashboardQuickActionCard accentClassName="bg-sky-100 text-sky-700" description={t('doctor.dashboard.viewAll')} icon={<CalendarIcon className="size-5" />} label={t('doctor.navigation.appointments')} onSelect={() => navigate('/doctor/appointments')} />
          <DashboardQuickActionCard accentClassName="bg-amber-100 text-amber-700" description={t('doctor.dashboard.tips.slides.profile.description')} icon={<VisitIcon className="size-5" />} label={t('doctor.consultation.homeVisit')} onSelect={() => navigate('/doctor/availability')} />
          <DashboardQuickActionCard accentClassName="bg-slate-100 text-slate-700" description={t('doctor.dashboard.tips.slides.profile.cta')} icon={<ProfileIcon className="size-5" />} label={t('doctor.navigation.profile')} onSelect={() => navigate('/doctor/profile')} />
        </DashboardServices>

        <DashboardSplit>
          <DashboardSectionCard action={viewAll} title={t('doctor.dashboard.upcomingAppointments')}>
            {insights?.upcoming_appointments.length ? <ul className="space-y-2.5">{insights.upcoming_appointments.map((appointment) => (
              <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] p-3.5" key={appointment.id}>
                <div><p className="font-extrabold">{appointment.patient_name}</p><p className="text-sm text-[var(--color-text-secondary)]">{t(`doctor.appointments.services.${appointment.service_type}`)}</p></div>
                <p className="direction-ltr text-sm font-bold">{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(appointment.starts_at))}</p>
              </li>
            ))}</ul> : <DashboardEmptyState description={t('doctor.dashboard.noUpcoming')} title={t('doctor.dashboard.noUpcoming')} />}
          </DashboardSectionCard>
          <DoctorPracticeTipsCarousel />
        </DashboardSplit>

        <DashboardSplit>
          <DashboardSectionCard description={t('doctor.dashboard.thisWeek')} title={t('doctor.dashboard.appointmentOverview')}>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><dt className="text-xs text-[var(--color-text-secondary)]">{t('doctor.dashboard.totalAppointments')}</dt><dd className="direction-ltr text-xl font-black tabular-nums">{totals.total}</dd></div>
              <div><dt className="text-xs text-[var(--color-text-secondary)]">{t('doctor.dashboard.completedCount')}</dt><dd className="direction-ltr text-xl font-black tabular-nums text-teal-800">{totals.completed}</dd></div>
              <div><dt className="text-xs text-[var(--color-text-secondary)]">{t('doctor.dashboard.upcomingCount')}</dt><dd className="direction-ltr text-xl font-black tabular-nums text-teal-500">{totals.upcoming}</dd></div>
              <div><dt className="text-xs text-[var(--color-text-secondary)]">{t('doctor.dashboard.cancelledCount')}</dt><dd className="direction-ltr text-xl font-black tabular-nums text-red-500">{totals.cancelled}</dd></div>
            </dl>
            <div className="mt-2 overflow-x-hidden"><AppointmentOverviewChart days={chartDays} /></div>
          </DashboardSectionCard>
          <DashboardSectionCard action={bothTypes ? <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">{(['all', CONSULTATION_TYPE.CLINIC, CONSULTATION_TYPE.HOME_VISIT] as const).map((key) => <button className={`rounded-lg px-2.5 py-1 ${utilizationFilter === key ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`} key={key} onClick={() => setUtilizationFilter(key)} type="button">{key === 'all' ? t('doctor.dashboard.filterAll') : t(`doctor.consultation.${key === 'clinic' ? 'clinic' : 'homeVisit'}`)}</button>)}</div> : undefined} title={t('doctor.dashboard.slotUtilization')}>
            <div className="mt-2 overflow-x-hidden"><SlotUtilizationChart available={utilization?.available ?? 0} availableLabel={t('doctor.dashboard.availableSlotsShort')} booked={utilization?.booked ?? 0} bookedLabel={t('doctor.dashboard.bookedSlots')} /></div>
          </DashboardSectionCard>
        </DashboardSplit>
        <p aria-live="polite" className="mt-4 min-h-6 text-center text-sm font-semibold text-[var(--color-primary)]">{notice}</p>
      </DashboardPage>
    </DoctorLayout>
  )
}
