import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ServiceCard } from '../../components/patient/ServiceCard'
import { HomeHeroCarousel } from '../../components/patient/HomeHeroCarousel'
import { BellIcon, CalendarIcon, LaboratoryIcon, StethoscopeIcon, VisitIcon } from '../../components/icons/PatientHomeIcons'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { ApiError } from '../../services/apiClient'
import { getPatientHome, logout, type AuthenticatedUser } from '../../services/authService'
import { buildLoginPath } from '../../utils/navigation'
import { PatientLayout } from '../../layouts/PatientLayout'
import { PublicLayout } from '../../layouts/PublicLayout'

const services = [
  { key: 'findDoctor', path: '/patient/doctors/search', accent: 'bg-[var(--color-primary-surface)] text-[var(--color-primary)]', icon: StethoscopeIcon },
  { key: 'homeVisit', path: null, accent: 'bg-amber-100 text-amber-600', icon: VisitIcon },
  { key: 'laboratory', path: null, accent: 'bg-sky-100 text-sky-600', icon: LaboratoryIcon },
  { key: 'appointments', path: '/patient/appointments', accent: 'bg-purple-100 text-purple-600', icon: CalendarIcon },
] as const

export function PatientHomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const requestController = new AbortController()
    let requestIsActive = true

    getPatientHome(requestController.signal)
      .then((authenticatedUser) => {
        if (!requestIsActive) return
        setUser(authenticatedUser)
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
    setNotice('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setNotice(t('patient.home.logoutError'))
      setIsLoggingOut(false)
    }
  }

  const announcePendingPage = (label: string) => {
    setNotice(t('patient.home.pendingPage', { page: label }))
  }

  if (loadState === 'loading') {
    return <PublicLayout><LoadingState contained message={t('patient.home.loading')} /></PublicLayout>
  }

  if (loadState === 'error' || !user) {
    return <PublicLayout><ErrorState contained message={t('patient.home.loadError')} onRetry={() => { setLoadState('loading'); setLoadAttempt((attempt) => attempt + 1) }} retryLabel={t('patient.home.retry')} /></PublicLayout>
  }

  const initials = `${user.first_name?.[0] ?? user.name[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <PatientLayout isLoggingOut={isLoggingOut} onAppointments={() => navigate('/patient/appointments')} onDashboard={() => navigate('/patient/home')} onLogout={handleLogout} onProfile={() => navigate('/patient/profile')}>
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">

        <header className="flex items-center justify-between gap-4 rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-5 shadow-sm rtl:bg-gradient-to-l sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            {user.profile_image_url ? <img alt="" className="size-14 shrink-0 rounded-2xl object-cover shadow-md sm:size-16" src={user.profile_image_url} /> : <div aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary)] text-base font-bold text-white shadow-md shadow-teal-700/15 sm:size-16">{initials}</div>}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-primary)] sm:text-base">{t('patient.home.welcomeBack')}</p>
              <h1 className="mt-1 truncate text-2xl font-extrabold text-[var(--color-text-primary)] sm:text-3xl">{t('patient.home.greeting', { name: user.first_name || user.name })}</h1>
            </div>
          </div>
          <button aria-label={t('patient.home.notifications')} className="grid size-12 shrink-0 place-items-center rounded-full border border-teal-100 bg-white text-[var(--color-text-secondary)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none" onClick={() => announcePendingPage(t('patient.home.notifications'))} type="button">
            <BellIcon className="size-6" />
          </button>
        </header>

        <HomeHeroCarousel />

        <section className="mt-7 rounded-3xl border border-[var(--color-border)] bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm sm:mt-9 sm:p-7 lg:p-8" aria-labelledby="medical-services-title">
          <h2 id="medical-services-title" className="text-2xl font-extrabold text-[var(--color-text-primary)] sm:text-3xl">{t('patient.home.servicesTitle')}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {services.map(({ key, path, accent, icon: Icon }, index) => {
              const label = t(`patient.home.services.${key}`)
              return <ServiceCard key={key} accentClassName={accent} actionLabel={t('patient.home.bookNow')} entranceDelay={index * 80} icon={<Icon className="size-8" />} label={label} onSelect={() => path ? navigate(path) : announcePendingPage(label)} />
            })}
          </div>
        </section>

        <p aria-live="polite" className="mt-4 min-h-6 text-center text-sm font-medium text-[var(--color-primary)]">{notice}</p>
      </div>
    </PatientLayout>
  )
}
