import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { DoctorLayout } from '../../layouts/DoctorLayout'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { logout } from '../../services/authService'
import { getDoctorDashboard, type DoctorDashboardData } from '../../services/doctorDashboardService'
import { buildLoginPath, DOCTOR_DASHBOARD_ROUTE } from '../../utils/navigation'

export function DoctorDashboardPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<DoctorDashboardData | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [notice, setNotice] = useState('')

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
          navigate('/', { replace: true })
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

  const announcePending = (page: string) => setNotice(t('doctor.dashboard.pendingPage', { page }))

  if (loadState === 'loading') {
    return <PublicLayout><LoadingState contained message={t('doctor.dashboard.loading')} /></PublicLayout>
  }

  if (loadState === 'error' || !dashboard) {
    return <PublicLayout><ErrorState contained message={t('doctor.dashboard.error')} onRetry={() => { setLoadState('loading'); setLoadAttempt((attempt) => attempt + 1) }} retryLabel={t('doctor.dashboard.retry')} /></PublicLayout>
  }

  const { profile, user } = dashboard
  const localizedName = (value: { name_en: string; name_ar: string } | null) => value ? (i18n.language.startsWith('ar') ? value.name_ar : value.name_en) : t('doctor.dashboard.notProvided')
  const status = profile?.verification_status ?? 'pending'

  return (
    <DoctorLayout
      isLoggingOut={isLoggingOut}
      onAvailability={() => announcePending(t('doctor.navigation.availability'))}
      onLogout={handleLogout}
      onProfile={() => navigate('/doctor/profile')}
    >
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
        <header className="rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-6 shadow-sm rtl:bg-gradient-to-l sm:p-8">
          <p className="font-semibold text-[var(--color-primary)]">{t('doctor.dashboard.welcome')}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">{profile?.profile_image_url && <img alt="" className="size-16 rounded-2xl object-cover shadow-sm" src={profile.profile_image_url} />}<h1 className="text-3xl font-extrabold text-[var(--color-text-primary)] sm:text-4xl">{t('doctor.dashboard.greeting', { name: user.first_name || user.name })}</h1></div>
            <span className="rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-bold text-[var(--color-primary)]">{t('doctor.dashboard.verification')}: {t(`doctor.dashboard.statuses.${status}`)}</span>
          </div>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm lg:col-span-2" aria-labelledby="doctor-profile-summary">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="doctor-profile-summary" className="text-2xl font-extrabold text-[var(--color-text-primary)]">{t('doctor.dashboard.profileTitle')}</h2>
              <button className="rounded-full border border-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transition-none" onClick={() => announcePending(t('doctor.dashboard.editProfile'))} type="button">{t('doctor.dashboard.editProfile')}</button>
            </div>
            {profile ? (
              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('doctor.dashboard.specialization')}</dt><dd className="mt-1 font-bold text-[var(--color-text-primary)]">{localizedName(profile.specialization)}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('doctor.dashboard.location')}</dt><dd className="mt-1 font-bold text-[var(--color-text-primary)]">{localizedName(profile.location)}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('doctor.dashboard.clinic')}</dt><dd className="mt-1 font-bold text-[var(--color-text-primary)]">{profile.clinic_name || t('doctor.dashboard.notProvided')}</dd></div>
              </dl>
            ) : (
              <div className="mt-6 rounded-2xl bg-amber-50 p-5 text-amber-900"><h3 className="font-bold">{t('doctor.dashboard.noProfileTitle')}</h3><p className="mt-1 text-sm">{t('doctor.dashboard.noProfileDescription')}</p></div>
            )}
          </section>

          <section className="rounded-3xl border border-teal-100 bg-[var(--color-primary-surface)] p-6 shadow-sm" aria-labelledby="doctor-availability">
            <h2 id="doctor-availability" className="text-xl font-extrabold text-[var(--color-text-primary)]">{t('doctor.dashboard.availabilityTitle')}</h2>
            <p className="mt-5 text-4xl font-extrabold text-[var(--color-primary)]">{profile?.available_slots_count ?? 0}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">{t('doctor.dashboard.availableSlots', { count: profile?.available_slots_count ?? 0 })}</p>
            <button className="mt-6 w-full rounded-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none" onClick={() => announcePending(t('doctor.dashboard.manageAvailability'))} type="button">{t('doctor.dashboard.manageAvailability')}</button>
          </section>
        </div>

        <section className="mt-5 rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm" aria-labelledby="doctor-appointments">
          <h2 id="doctor-appointments" className="text-2xl font-extrabold text-[var(--color-text-primary)]">{t('doctor.dashboard.appointmentsTitle')}</h2>
          <p className="mt-2 text-[var(--color-text-secondary)]">{t('doctor.dashboard.appointmentsPending')}</p>
        </section>
        <p aria-live="polite" className="mt-4 min-h-6 text-center text-sm font-semibold text-[var(--color-primary)]">{notice}</p>
      </div>
    </DoctorLayout>
  )
}
