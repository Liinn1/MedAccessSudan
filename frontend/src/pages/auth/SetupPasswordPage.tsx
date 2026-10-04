import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { InputField } from '../../components/forms/InputField'
import { EyeIcon, LockIcon, MailIcon } from '../../components/icons/AuthIcons'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { completePasswordSetup } from '../../services/passwordService'
import { isValidEmail, isValidRegistrationPassword } from '../../utils/authValidation'

export function SetupPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const email = params.get('email')?.trim() ?? ''
  const token = params.get('token')?.trim() ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!isValidEmail(email) || !token) { setError(t('security.setup.invalid')); return }
    if (!isValidRegistrationPassword(password)) { setError(t('security.errors.weak')); return }
    if (password !== confirmation) { setError(t('security.errors.mismatch')); return }
    setBusy(true); setError('')
    try {
      await completePasswordSetup({ email, token, password, password_confirmation: confirmation })
      setPassword(''); setConfirmation(''); setDone(true)
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 422 ? t('security.setup.invalid') : t('security.errors.generic'))
    } finally { setBusy(false) }
  }

  return (
    <PublicLayout>
      <AuthShell subtitle={done ? t('security.setup.successBody') : t('security.setup.subtitle')} title={done ? t('security.setup.successTitle') : t('security.setup.title')}>
        {done ? (
          <Link className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-primary)] px-6 font-bold text-white" to="/admin/login">{t('security.setup.signIn')}</Link>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <InputField disabled icon={<MailIcon />} id="setup-email" label={t('profilePage.email')} value={email} />
            <InputField autoComplete="new-password" endAdornment={<button aria-label={t(visible ? 'auth.login.hidePassword' : 'auth.login.showPassword')} className="grid size-11 place-items-center" onClick={() => setVisible((value) => !value)} type="button"><EyeIcon visible={visible} /></button>} icon={<LockIcon />} id="setup-password" label={t('security.next')} onChange={(event) => setPassword(event.target.value)} type={visible ? 'text' : 'password'} value={password} />
            <InputField autoComplete="new-password" icon={<LockIcon />} id="setup-confirm" label={t('security.confirm')} onChange={(event) => setConfirmation(event.target.value)} type={visible ? 'text' : 'password'} value={confirmation} />
            <p className="text-sm text-[var(--color-text-secondary)]">{t('security.rules')}</p>
            {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
            <PrimaryButton disabled={busy} type="submit">{busy ? t('security.working') : t('security.setup.submit')}</PrimaryButton>
          </form>
        )}
      </AuthShell>
    </PublicLayout>
  )
}
