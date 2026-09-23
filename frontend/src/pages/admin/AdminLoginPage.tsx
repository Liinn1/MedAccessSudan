import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../../components/branding/BrandMark'
import { LanguageToggle } from '../../components/LanguageToggle'
import { ApiError } from '../../services/apiClient'
import { getCurrentUser, loginAdmin } from '../../services/authService'

export function AdminLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    getCurrentUser(controller.signal)
      .then((user) => {
        if (user.role === 'admin' || user.role === 'super_admin') {
          navigate('/admin/dashboard', { replace: true })
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (!(error instanceof ApiError) || error.status !== 401) {
          setErrorKey('admin.login.error')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsCheckingSession(false)
      })

    return () => controller.abort()
  }, [navigate])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isCheckingSession || isSubmitting) return

    setIsSubmitting(true)
    setErrorKey('')

    try {
      const user = await loginAdmin(identifier.trim(), password)
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        setErrorKey('admin.login.invalid')
        return
      }

      setPassword('')
      navigate('/admin/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 422) setErrorKey('admin.login.invalid')
        else if (error.status === 429) setErrorKey('admin.login.tooManyAttempts')
        else if (error.status === 419) setErrorKey('admin.login.sessionExpired')
        else setErrorKey('admin.login.error')
      } else {
        setErrorKey('admin.login.error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-background)] px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-white p-7 shadow-xl sm:p-10">
        <div className="flex items-start justify-between gap-4"><BrandMark variant="auth" /><LanguageToggle /></div>
        <p className="mt-8 font-bold text-[var(--color-primary)]">{t('admin.eyebrow')}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{t('admin.login.title')}</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">{t('admin.login.description')}</p>

        <form className="mt-7 space-y-5" noValidate onSubmit={submit}>
          <div>
            <label className="block font-bold" htmlFor="admin-identifier">{t('admin.login.identifier')}</label>
            <input autoComplete="username" className="mt-2 w-full rounded-xl border border-[var(--color-border)] px-4 py-3 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" id="admin-identifier" onChange={(event) => setIdentifier(event.target.value)} required value={identifier} />
          </div>
          <div>
            <label className="block font-bold" htmlFor="admin-password">{t('admin.login.password')}</label>
            <input autoComplete="current-password" className="mt-2 w-full rounded-xl border border-[var(--color-border)] px-4 py-3 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" id="admin-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </div>
          {errorKey && <p aria-live="polite" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{t(errorKey)}</p>}
          <button aria-busy={isSubmitting} className="min-h-12 w-full rounded-full bg-[var(--color-primary)] px-5 font-bold text-white transition hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-wait disabled:opacity-60" disabled={isCheckingSession || isSubmitting || !identifier.trim() || !password} type="submit">
            {t(isSubmitting ? 'admin.login.signingIn' : isCheckingSession ? 'admin.login.checkingSession' : 'admin.login.submit')}
          </button>
        </form>
      </section>
    </main>
  )
}
