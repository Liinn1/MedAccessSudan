import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ServiceCard } from '../../components/patient/ServiceCard'
import { CalendarIcon, LaboratoryIcon, LocationIcon, StethoscopeIcon, VisitIcon } from '../../components/icons/PatientHomeIcons'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { InformationDialog } from '../../components/feedback/InformationDialog'
import { ApiError } from '../../services/apiClient'
import { getPatientHome, logout, type AuthenticatedUser } from '../../services/authService'
import { getPatientAppointments, type PatientAppointment } from '../../services/patientAppointmentService'
import { buildLoginPath } from '../../utils/navigation'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { PatientLayout } from '../../layouts/PatientLayout'

const services = [
  { key: 'findDoctor', path: '/patient/doctors/search', accent: 'bg-[var(--color-primary-surface)] text-[var(--color-primary)]', icon: StethoscopeIcon, future: false },
  { key: 'homeVisit', path: '/patient/home-visits', accent: 'bg-amber-100 text-amber-600', icon: VisitIcon, future: false },
  { key: 'laboratory', path: null, accent: 'bg-sky-100 text-sky-600', icon: LaboratoryIcon, future: true },
  { key: 'appointments', path: '/patient/appointments', accent: 'bg-purple-100 text-purple-600', icon: CalendarIcon, future: false },
] as const

const healthTips = ['checkups', 'hydration', 'movement'] as const
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

export function PatientHomePage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [futureFeature, setFutureFeature] = useState('')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [activeTip, setActiveTip] = useState(0)

  useEffect(() => {
    const requestController = new AbortController()
    let requestIsActive = true

    Promise.all([
      getPatientHome(requestController.signal),
      getPatientAppointments(requestController.signal),
    ])
      .then(([authenticatedUser, patientAppointments]) => {
        if (!requestIsActive) return
        setUser(authenticatedUser)
        setAppointments(patientAppointments)
        setLoadState('success')
      })
      .catch((error: unknown) => {
        if (!requestIsActive || (error instanceof DOMException && error.name === 'AbortError')) return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          navigate(buildLoginPath('/patient/home'), { replace: true })
          return
        }
        setLoadState('error')
      })

    return () => {
      requestIsActive = false
      requestController.abort()
    }
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

  if (loadState === 'loading') {
    return <PatientLayout><LoadingState contained message={t('patient.dashboard.loading')} /></PatientLayout>
  }

  if (loadState === 'error' || !user) {
    return <PatientLayout><ErrorState contained message={t('patient.dashboard.loadError')} onRetry={() => { setLoadState('loading'); setLoadAttempt((attempt) => attempt + 1) }} retryLabel={t('patient.home.retry')} /></PatientLayout>
  }

  const initials = `${user.first_name?.[0] ?? user.name[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
  const firstName = user.first_name || user.name.split(' ')[0] || user.name
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-SD' : 'en'
  const upcomingAppointments = appointments
    .filter((appointment) => appointment.status === 'confirmed' && new Date(appointment.ends_at) >= new Date())
    .sort((first, second) => new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime())
    .slice(0, 3)
  const tipKey = healthTips[activeTip]

  return (
    <PatientLayout isLoggingOut={isLoggingOut} onAppointments={() => navigate('/patient/appointments')} onDashboard={() => navigate('/patient/home')} onLogout={handleLogout} onProfile={() => navigate('/patient/profile')} user={user}>
      <div className="mx-auto max-w-[96rem] overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">{t(`patient.dashboard.greetings.${greetingKey}`, { name: firstName })}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)] sm:text-base">{t('patient.dashboard.supportingText')}</p>
          </div>
          <p className="max-w-48 rounded-2xl bg-[var(--color-primary-surface)] px-4 py-3 text-center text-sm font-bold leading-snug text-[var(--color-primary)]">{t('patient.dashboard.healthMessage')}</p>
        </header>

        <section className="mt-5 grid gap-4 xl:grid-cols-[0.82fr_1.05fr_1.45fr]" aria-label={t('patient.dashboard.overviewLabel')}>
          <article className="dashboard-card-enter rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {user.profile_image_url ? <img alt={user.name} className="size-24 rounded-full border-4 border-[var(--color-primary-surface)] object-cover shadow-sm" src={user.profile_image_url} /> : <div aria-hidden="true" className="grid size-24 place-items-center rounded-full border-4 border-[var(--color-primary-surface)] bg-[var(--color-primary)] text-2xl font-black text-white">{initials}</div>}
              <h2 className="mt-3 text-lg font-extrabold">{user.name}</h2>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{t('roles.patient')}</p>
              <button className="mt-4 min-h-10 rounded-xl border border-[var(--color-border)] px-4 text-sm font-bold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" onClick={() => navigate('/patient/profile')} type="button">{t('patient.dashboard.editProfile')}</button>
            </div>
          </article>

          <article className="dashboard-card-enter rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm [animation-delay:60ms]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">{t('patient.dashboard.personalInformation')}</h2>
              <button className="text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/patient/profile')} type="button">{t('patient.dashboard.edit')}</button>
            </div>
            <dl className="mt-2">
              <DetailRow icon={StethoscopeIcon} label={t('patient.dashboard.email')} value={user.email} />
              <DetailRow icon={VisitIcon} label={t('patient.dashboard.phone')} value={user.phone} />
            </dl>
            {!user.phone && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">{t('patient.dashboard.missingInformation')}</p>}
          </article>

          <article className="dashboard-card-enter min-w-0 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm [animation-delay:120ms]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-extrabold"><CalendarIcon className="size-5 text-[var(--color-primary)]" />{t('patient.dashboard.upcomingAppointments')}</h2>
              <button className="shrink-0 text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/patient/appointments')} type="button">{t('patient.dashboard.viewAll')}</button>
            </div>
            {upcomingAppointments.length ? <div className="mt-3 grid gap-2">
              {upcomingAppointments.map((appointment) => {
                const startsAt = new Date(appointment.starts_at)
                const date = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', timeZone: SUDAN_TIME_ZONE }).format(startsAt)
                const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(startsAt)
                const specialty = i18n.resolvedLanguage === 'ar' ? appointment.doctor.specialization.name_ar : appointment.doctor.specialization.name_en
                const location = i18n.resolvedLanguage === 'ar' ? appointment.doctor.location.name_ar : appointment.doctor.location.name_en
                return <button className="group grid min-w-0 grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-start transition hover:border-teal-200 hover:bg-[var(--color-primary-surface)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] max-sm:grid-cols-[4rem_1fr]" key={appointment.id} onClick={() => navigate(`/patient/appointments/${appointment.id}`)} type="button">
                  <span className="rounded-lg bg-white px-2 py-2 text-center shadow-sm"><strong className="block text-sm text-[var(--color-text-primary)]">{date}</strong><span className="direction-ltr mt-0.5 block text-[0.68rem] text-[var(--color-text-secondary)]">{time}</span></span>
                  <span className="min-w-0"><strong className="block truncate text-sm">{appointment.doctor.name}</strong><span className="mt-0.5 block truncate text-xs text-[var(--color-text-secondary)]">{specialty}</span><span className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] text-[var(--color-text-secondary)]"><LocationIcon className="size-3 shrink-0" />{appointment.doctor.clinic_name || location}</span></span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[0.68rem] font-bold text-sky-700 max-sm:hidden">{t(`patient.appointments.statuses.${appointment.status}`)}</span>
                </button>
              })}
            </div> : <div className="mt-4 rounded-xl border border-dashed border-teal-200 bg-[var(--color-primary-surface)] p-5 text-center"><CalendarIcon className="mx-auto size-7 text-[var(--color-primary)]" /><p className="mt-2 text-sm font-bold">{t('patient.dashboard.noUpcomingTitle')}</p><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t('patient.dashboard.noUpcomingDescription')}</p><button className="mt-3 text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/patient/doctors/search')} type="button">{t('patient.dashboard.bookAppointment')}</button></div>}
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="medical-services-title">
          <h2 id="medical-services-title" className="text-xl font-extrabold text-[var(--color-text-primary)]">{t('patient.dashboard.servicesTitle')}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {services.map(({ key, path, accent, icon: Icon, future }, index) => {
              const label = t(`patient.home.services.${key}`)
              return <ServiceCard key={key} accentClassName={accent} actionLabel={t(`patient.dashboard.serviceDescriptions.${key}`)} entranceDelay={index * 60} futureLabel={future ? t('publicHome.comingSoon') : undefined} icon={<Icon className="size-6" />} label={label} onSelect={() => path ? navigate(path) : setFutureFeature(label)} />
            })}
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
          <article className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-extrabold"><LaboratoryIcon className="size-5 text-sky-600" />{t('patient.dashboard.laboratory.title')}</h2>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">{t('publicHome.comingSoon')}</span>
            </div>
            <div className="mt-4 flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-sky-200 bg-sky-50/55 px-5 py-6 text-center">
              <span className="grid size-11 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm"><LaboratoryIcon className="size-6" /></span>
              <h3 className="mt-3 font-extrabold">{t('patient.dashboard.laboratory.emptyTitle')}</h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">{t('patient.dashboard.laboratory.emptyDescription')}</p>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 px-5 pt-5">
              <h2 className="text-lg font-extrabold">{t('patient.dashboard.healthTips.title')}</h2>
              <div className="flex gap-2">
                <button aria-label={t('patient.dashboard.healthTips.previous')} className="grid size-8 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] rtl:rotate-180" onClick={() => setActiveTip((current) => (current + healthTips.length - 1) % healthTips.length)} type="button">‹</button>
                <button aria-label={t('patient.dashboard.healthTips.next')} className="grid size-8 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] rtl:rotate-180" onClick={() => setActiveTip((current) => (current + 1) % healthTips.length)} type="button">›</button>
              </div>
            </div>
            <div className="mx-5 mt-3 grid min-h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-400 p-5 text-white">
              <div className="grid size-14 place-items-center rounded-full bg-white/15 ring-1 ring-white/30"><StethoscopeIcon className="size-8" /></div>
            </div>
            <div className="px-5 pb-5 pt-3">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{t(`patient.dashboard.healthTips.items.${tipKey}`)}</p>
              <div className="mt-3 flex justify-center gap-2" aria-hidden="true">{healthTips.map((key, index) => <span className={`size-2 rounded-full ${index === activeTip ? 'bg-[var(--color-primary)]' : 'bg-slate-200'}`} key={key} />)}</div>
            </div>
          </article>
        </section>
      </div>
      <InformationDialog closeLabel={t('publicHome.footer.comingSoonClose')} description={futureFeature === t('patient.home.logoutError') ? futureFeature : t('publicHome.footer.comingSoonDescription', { feature: futureFeature })} onClose={() => setFutureFeature('')} open={Boolean(futureFeature)} title={futureFeature || t('publicHome.comingSoon')} />
    </PatientLayout>
  )
}
