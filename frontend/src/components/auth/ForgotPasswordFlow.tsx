import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PrimaryButton } from '../buttons/PrimaryButton'
import { InputField } from '../forms/InputField'
import { EyeIcon, LockIcon, MailIcon } from '../icons/AuthIcons'
import { ApiError } from '../../services/apiClient'
import { confirmPasswordReset, requestPasswordReset, resendPasswordResetCode } from '../../services/passwordService'
import { isValidEmail, isValidRegistrationPassword } from '../../utils/authValidation'

type Step = 'email' | 'code' | 'password' | 'success'

export function ForgotPasswordFlow({ loginPath, onCancel }: { loginPath: string; onCancel?: () => void }) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function sendCode(event: FormEvent) {
    event.preventDefault()
    if (!isValidEmail(email)) { setError(t('auth.forgot.emailInvalid')); return }
    setBusy(true); setError('')
    try {
      const response = await requestPasswordReset(email.trim())
      setChallengeId(response.data.challenge_id)
      setInfo(t('auth.forgot.sent'))
      setStep('code')
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 429 ? t('auth.forgot.tooMany') : t('auth.forgot.unavailable'))
    } finally { setBusy(false) }
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code.trim())) { setError(t('security.errors.codeRequired')); return }
    if (!isValidRegistrationPassword(password)) { setError(t('security.errors.weak')); return }
    if (password !== confirmation) { setError(t('security.errors.mismatch')); return }
    setBusy(true); setError('')
    try {
      await confirmPasswordReset({
        email: email.trim(),
        challenge_id: challengeId,
        code: code.trim(),
        password,
        password_confirmation: confirmation,
      })
      setPassword(''); setConfirmation(''); setCode('')
      setStep('success')
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) setError(t('security.errors.code'))
      else setError(t('auth.forgot.unavailable'))
    } finally { setBusy(false) }
  }

  async function resend() {
    if (!challengeId) return
    setBusy(true); setError('')
    try {
      await resendPasswordResetCode(email.trim(), challengeId)
      setInfo(t('auth.forgot.sent'))
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 429 ? t('auth.forgot.tooMany') : t('auth.forgot.unavailable'))
    } finally { setBusy(false) }
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl bg-[var(--color-success-surface)] px-4 py-3 text-sm font-semibold text-emerald-800">{t('auth.forgot.success')}</p>
        <Link className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-primary)] px-6 font-bold text-white" to={loginPath}>{t('auth.login.submit')}</Link>
      </div>
    )
  }

  if (step === 'email') {
    return (
      <form className="flex flex-col gap-4" onSubmit={sendCode}>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('auth.forgot.help')}</p>
        <InputField autoComplete="email" className="direction-ltr" error={error || undefined} icon={<MailIcon />} id="reset-email" label={t('auth.forgot.email')} onChange={(event) => { setEmail(event.target.value); setError('') }} type="email" value={email} />
        <PrimaryButton disabled={busy} type="submit">{busy ? t('security.working') : t('auth.forgot.send')}</PrimaryButton>
        {onCancel
          ? <button className="text-center text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={onCancel} type="button">{t('security.back')}</button>
          : <Link className="text-center text-sm font-bold text-[var(--color-primary)] hover:underline" to={loginPath}>{t('security.back')}</Link>}
      </form>
    )
  }

  if (step === 'code') {
    return (
      <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (!/^\d{6}$/.test(code.trim())) { setError(t('security.errors.codeRequired')); return } setError(''); setStep('password') }}>
        {info && <p className="rounded-xl bg-[var(--color-success-surface)] px-4 py-3 text-sm font-semibold text-emerald-800">{info}</p>}
        <p className="text-sm text-[var(--color-text-secondary)]">{t('security.verifyBody', { email })}</p>
        <InputField autoComplete="one-time-code" error={error || undefined} icon={<LockIcon />} id="reset-code" inputMode="numeric" label={t('auth.forgot.code')} maxLength={6} onChange={(event) => { setCode(event.target.value); setError('') }} value={code} />
        <PrimaryButton disabled={busy} type="submit">{t('auth.forgot.continue')}</PrimaryButton>
        <button className="text-sm font-bold text-[var(--color-primary)] hover:underline disabled:opacity-60" disabled={busy} onClick={resend} type="button">{t('security.resend')}</button>
        <button className="text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => { setStep('email'); setError('') }} type="button">{t('security.back')}</button>
      </form>
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submitReset}>
      <InputField autoComplete="new-password" endAdornment={<button aria-label={t(visible ? 'auth.login.hidePassword' : 'auth.login.showPassword')} className="grid size-11 place-items-center" onClick={() => setVisible((value) => !value)} type="button"><EyeIcon visible={visible} /></button>} icon={<LockIcon />} id="reset-password" label={t('security.next')} onChange={(event) => setPassword(event.target.value)} type={visible ? 'text' : 'password'} value={password} />
      <InputField autoComplete="new-password" icon={<LockIcon />} id="reset-confirm" label={t('security.confirm')} onChange={(event) => setConfirmation(event.target.value)} type={visible ? 'text' : 'password'} value={confirmation} />
      <p className="text-sm text-[var(--color-text-secondary)]">{t('security.rules')}</p>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <PrimaryButton disabled={busy} type="submit">{busy ? t('security.working') : t('auth.forgot.submit')}</PrimaryButton>
      <button className="text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => { setStep('code'); setError('') }} type="button">{t('security.back')}</button>
    </form>
  )
}

export function RememberMeRow({
  checked,
  onForgot,
  onToggle,
}: {
  checked: boolean
  onForgot: () => void
  onToggle: (value: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
        <input
          checked={checked}
          className="size-4 accent-[var(--color-primary)]"
          onChange={(event) => onToggle(event.target.checked)}
          type="checkbox"
        />
        {t('auth.login.rememberMe')}
      </label>
      <button
        className="min-h-11 rounded-lg px-1 text-sm font-semibold text-[var(--color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        onClick={onForgot}
        type="button"
      >
        {t('auth.login.forgotPassword')}
      </button>
    </div>
  )
}
