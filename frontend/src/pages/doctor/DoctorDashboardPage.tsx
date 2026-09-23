import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppointmentOverviewChart, SlotUtilizationChart } from '../../components/charts/DoctorDashboardCharts'
import { DoctorPracticeTipsCarousel } from '../../components/doctor/DoctorPracticeTipsCarousel'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LocationIcon, StethoscopeIcon, VisitIcon } from '../../components/icons/PatientHomeIcons'
import { DoctorLayout } from '../../layouts/DoctorLayout'
import { ApiError } from '../../services/apiClient'
import { getCurrentUser, logout } from '../../services/authService'
import { CONSULTATION_TYPE, getDoctorDashboard, type ConsultationType, type DoctorDashboardData } from '../../services/doctorDashboardService'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { buildLoginPath, DOCTOR_DASHBOARD_ROUTE, PATIENT_DEFAULT_ROUTE } from '../../utils/navigation'

type DashboardIcon = ComponentType<SVGProps<SVGSVGElement>>

function DetailRow({ icon: Icon, label, value }: { icon: DashboardIcon; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-surface)] text-[var(--color-primary)]"><Icon className="size-4" /></span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-[var(--color-text-secondary)]">{label}</dt>
        <dd className={`mt-0.5 break-words text-sm font-bold ${value ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>{value || '—'}</dd>
      </div>
    </div>
  )
}

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
    let active = true
    getDoctorDashboard(controller.signal)
      .then((data) => {
        if (!active) return
        setDashboard(data)
        setLoadState('success')
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return
        if (error instanceof ApiError && error.status === 401) {
          navigate(buildLoginPath(DOCTOR_DASHBOARD_ROUTE), { replace: true })
          return
        }
        if (error instanceof ApiError && error.status === 403) {
          getCurrentUser()
            .then((user) => {
              if (user.role === 'patient') navigate(PATIENT_DEFAULT_ROUTE, { replace: true })
              else setLoadState('error')
            })
            .catch(() => navigate('/login', { replace: true }))
          return
        }
        setLoadState('error')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [loadAttempt, navigate])

  async function handleLogout() {
    setIsLoggingOut(true)
    setNotice('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setNotice(t('doctor.dashboard.logoutError'))
      setIsLoggingOut(false)
    }
  }

  if (loadState === 'loading') {
    return <DoctorLayout><LoadingState contained message={t('doctor.dashboard.loading')} /></DoctorLayout>
  }

  if (loadState === 'error' || !dashboard) {
    return <DoctorLayout><ErrorState contained message={t('doctor.dashboard.error')} onRetry={() => { setLoadState('loading'); setLoadAttempt((attempt) => attempt + 1) }} retryLabel={t('doctor.dashboard.retry')} /></DoctorLayout>
  }

  const { profile, user, insights } = dashboard
  const locale = i18n.language.startsWith('ar') ? 'ar-SD' : 'en'
  const localizedName = (value: { name_en: string; name_ar: string } | null) => value ? (i18n.language.startsWith('ar') ? value.name_ar : value.name_en) : null
  const firstName = user.first_name || user.name.split(' ')[0] || user.name
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const initials = `${user.first_name?.[0] ?? user.name[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
  const status = profile?.verification_status ?? 'pending'
  const offersClinic = Boolean(profile?.offers_clinic_visits)
  const offersHome = Boolean(profile?.offers_home_visits)
  const bothTypes = offersClinic && offersHome
  const specialty = localizedName(profile?.specialization ?? null)
  const weekdayLabels = [t('doctor.availability.days.0'), t('doctor.availability.days.1'), t('doctor.availability.days.2'), t('doctor.availability.days.3'), t('doctor.availability.days.4'), t('doctor.availability.days.5'), t('doctor.availability.days.6')]
  const chartDays = (insights?.appointment_overview.days ?? []).map((day) => ({
    label: weekdayLabels[day.weekday]?.slice(0, 3) ?? day.date,
    completed: day.completed,
    upcoming: day.upcoming,
    cancelled: day.cancelled,
  }))
  const totals = insights?.appointment_overview.totals ?? { total: 0, completed: 0, upcoming: 0, cancelled: 0 }
  const utilization = utilizationFilter === 'all'
    ? insights?.slot_utilization.all
    : insights?.slot_utilization.by_type[utilizationFilter]
  const formatSlot = (value?: string | null) => value
    ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(value))
    : null

  return (
    <DoctorLayout isLoggingOut={isLoggingOut} onLogout={handleLogout} roleLabel={specialty ?? t('roles.doctor')} user={{ ...user, profile_image_url: profile?.profile_image_url ?? user.profile_image_url }}>
      <div className="mx-auto max-w-[96rem] overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">{t(`doctor.dashboard.greetings.${greetingKey}`, { name: firstName })}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)] sm:text-base">{t('doctor.dashboard.supportingText')}</p>
          </div>
          <p className="max-w-56 rounded-2xl bg-[var(--color-primary-surface)] px-4 py-3 text-center text-sm font-bold leading-snug text-[var(--color-primary)]">{t('doctor.dashboard.healthMessage')}</p>
        </header>

        <section className="mt-5 grid gap-4 xl:grid-cols-[0.82fr_1.05fr_1.45fr]" aria-label={t('doctor.dashboard.overviewLabel')}>
          <article className="dashboard-card-enter rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {profile?.profile_image_url || user.profile_image_url
                ? <img alt={user.name} className="size-24 rounded-full border-4 border-[var(--color-primary-surface)] object-cover shadow-sm" src={profile?.profile_image_url || user.profile_image_url || ''} />
                : <div aria-hidden="true" className="grid size-24 place-items-center rounded-full border-4 border-[var(--color-primary-surface)] bg-[var(--color-primary)] text-2xl font-black text-white">{initials}</div>}
              <h2 className="mt-3 text-lg font-extrabold">{user.name}</h2>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{specialty ?? t('roles.doctor')}</p>
              <span className="mt-2 rounded-full bg-[var(--color-primary-surface)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">{t(`doctor.dashboard.statuses.${status}`)}</span>
              <button className="mt-4 min-h-10 rounded-xl border border-[var(--color-border)] px-4 text-sm font-bold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)]" onClick={() => navigate('/doctor/profile')} type="button">{t('doctor.dashboard.editProfile')}</button>
            </div>
          </article>

          <article className="dashboard-card-enter rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm [animation-delay:60ms]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold">{t('doctor.dashboard.practiceTitle')}</h2>
              <button className="text-sm font-bold text-[var(--color-primary)]" onClick={() => navigate('/doctor/profile')} type="button">{t('doctor.dashboard.edit')}</button>
            </div>
            <dl className="mt-2">
              <DetailRow icon={StethoscopeIcon} label={t('doctor.dashboard.specialization')} value={specialty} />
              <DetailRow icon={LocationIcon} label={t('doctor.dashboard.location')} value={localizedName(profile?.location ?? null)} />
              {offersClinic && <DetailRow icon={LocationIcon} label={t('doctor.dashboard.clinic')} value={profile?.clinic_name ?? null} />}
              <DetailRow icon={VisitIcon} label={t('doctor.dashboard.consultationTypes')} value={[offersClinic ? t('doctor.consultation.clinic') : null, offersHome ? t('doctor.consultation.homeVisit') : null].filter(Boolean).join(' · ') || t('doctor.dashboard.notProvided')} />
            </dl>
          </article>

          <article className="dashboard-card-enter rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm [animation-delay:120ms]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold">{t('doctor.dashboard.availabilityCardTitle')}</h2>
              <button className="text-sm font-bold text-[var(--color-primary)]" onClick={() => navigate('/doctor/availability')} type="button">{t('doctor.dashboard.manageAvailability')}</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {offersClinic && (
                <div className="rounded-2xl bg-[var(--color-primary-surface)] p-3">
                  <p className="text-xs font-bold text-[var(--color-text-secondary)]">{t('doctor.consultation.clinic')}</p>
                  <p className="mt-1 font-extrabold text-[var(--color-primary)]">{t('doctor.dashboard.active')}</p>
                  <p className="mt-2 text-sm font-semibold">{formatSlot(profile?.next_available?.clinic) ?? t('doctor.dashboard.noClinicSlots')}</p>
                </div>
              )}
              {offersHome && (
                <div className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-xs font-bold text-[var(--color-text-secondary)]">{t('doctor.consultation.homeVisit')}</p>
                  <p className="mt-1 font-extrabold text-amber-700">{t('doctor.dashboard.active')}</p>
                  <p className="mt-2 text-sm font-semibold">{formatSlot(profile?.next_available?.home_visit) ?? t('doctor.dashboard.noHomeSlots')}</p>
                </div>
              )}
              {!offersClinic && !offersHome && <p className="text-sm text-[var(--color-text-secondary)]">{t('doctor.dashboard.notProvided')}</p>}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="dashboard-card-enter rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-extrabold">{t('doctor.dashboard.appointmentOverview')}</h2>
              <p className="text-xs font-bold text-[var(--color-text-secondary)]">{t('doctor.dashboard.thisWeek')}</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><dt className="text-xs text-[var(--color-text-secondary)]">{t('doctor.dashboard.totalAppointments')}</dt><dd className="text-xl font-black">{totals.total}</dd></div>
              <div><dt className="text-xs text-[var(--color-text-secondary)]">{t('doctor.dashboard.completedCount')}</dt><dd className="text-xl font-black text-teal-800">{totals.completed}</dd></div>
              <div><dt className="text-xs text-[var(--color-text-secondary)]">{t('doctor.dashboard.upcomingCount')}</dt><dd className="text-xl font-black text-teal-500">{totals.upcoming}</dd></div>
              <div><dt className="text-xs text-[var(--color-text-secondary)]">{t('doctor.dashboard.cancelledCount')}</dt><dd className="text-xl font-black text-red-500">{totals.cancelled}</dd></div>
            </dl>
            <div className="mt-2 overflow-x-hidden"><AppointmentOverviewChart days={chartDays} /></div>
          </article>

          <article className="dashboard-card-enter rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-extrabold">{t('doctor.dashboard.slotUtilization')}</h2>
              {bothTypes && (
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                  {(['all', CONSULTATION_TYPE.CLINIC, CONSULTATION_TYPE.HOME_VISIT] as const).map((key) => (
                    <button className={`rounded-lg px-2.5 py-1 ${utilizationFilter === key ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`} key={key} onClick={() => setUtilizationFilter(key)} type="button">
                      {key === 'all' ? t('doctor.dashboard.filterAll') : t(`doctor.consultation.${key === 'clinic' ? 'clinic' : 'homeVisit'}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4">
              <SlotUtilizationChart
                available={utilization?.available ?? 0}
                availableLabel={t('doctor.dashboard.availableSlotsShort')}
                booked={utilization?.booked ?? 0}
                bookedLabel={t('doctor.dashboard.bookedSlots')}
              />
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <article className="dashboard-card-enter rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold">{t('doctor.dashboard.upcomingAppointments')}</h2>
              <button className="text-sm font-bold text-[var(--color-primary)]" onClick={() => navigate('/doctor/appointments')} type="button">{t('doctor.dashboard.viewAll')}</button>
            </div>
            {insights?.upcoming_appointments.length ? (
              <ul className="mt-4 grid gap-3">
                {insights.upcoming_appointments.map((appointment) => (
                  <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-3" key={appointment.id}>
                    <div>
                      <p className="font-extrabold">{appointment.patient_name}</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">{t(`doctor.appointments.services.${appointment.service_type}`)}</p>
                    </div>
                    <div className="text-end text-sm">
                      <p className="font-bold">{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(appointment.starts_at))}</p>
                      <p className="text-[var(--color-text-secondary)]">{t(`doctor.appointments.statuses.${appointment.status}`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">{t('doctor.dashboard.noUpcoming')}</p>
            )}
          </article>

          <DoctorPracticeTipsCarousel />
        </section>
        <p aria-live="polite" className="mt-4 min-h-6 text-center text-sm font-semibold text-[var(--color-primary)]">{notice}</p>
      </div>
    </DoctorLayout>
  )
}
