import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ContextualFeedback, type ContextualFeedbackState } from '../feedback/ContextualFeedback'
import { CheckIcon, EyeIcon, LockIcon, MailIcon } from '../icons/AuthIcons'
import { ApiError } from '../../services/apiClient'
import { confirmPasswordChange, passwordChangeErrorKey, resendPasswordChangeCode, startPasswordChange, type PasswordChallenge } from '../../services/passwordService'
import { isValidRegistrationPassword, laravelFieldErrors } from '../../utils/authValidation'

const fieldClass = 'mt-2 block min-h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100'

export function SecuritySection() {
  const { t } = useTranslation()
  const [step, setStep] = useState<'idle' | 'form' | 'verify' | 'success'>('idle')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [challenge, setChallenge] = useState<PasswordChallenge | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<ContextualFeedbackState>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  function toggle(key: keyof typeof visible) {
    setVisible((currentValue) => ({ ...currentValue, [key]: !currentValue[key] }))
  }

  function resetFormFields() {
    setCurrent(''); setNext(''); setConfirm(''); setCode(['', '', '', '', '', ''])
  }

  function closeFlow() {
    setStep('idle'); setChallenge(null); resetFormFields(); setFieldErrors({}); setFeedback(null)
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {}
    if (!current) nextErrors.current = t('security.errors.currentRequired')
    if (!isValidRegistrationPassword(next)) nextErrors.next = t('security.errors.weak')
    if (confirm !== next) nextErrors.confirm = t('security.errors.mismatch')
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault()
    if (!validateForm()) return
    setBusy(true); setFeedback(null)
    try {
      const result = await startPasswordChange({ current_password: current, password: next, password_confirmation: confirm })
      resetFormFields()
      setChallenge(result)
      setResendIn(result.resend_after)
      setStep('verify')
    } catch (error) {
      setFeedback({ type: 'error', messageKey: error instanceof ApiError && laravelFieldErrors(error.details).password ? 'security.errors.weak' : passwordChangeErrorKey(error, 'current') })
    } finally { setBusy(false) }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault()
    const joined = code.join('')
    if (joined.length !== 6) { setFieldErrors({ code: t('security.errors.codeRequired') }); return }
    if (!challenge) return
    setBusy(true); setFeedback(null); setFieldErrors({})
    try {
      await confirmPasswordChange({ challenge_id: challenge.challenge_id, code: joined })
      setStep('success')
      setChallenge(null)
    } catch (error) {
      setFeedback({ type: 'error', messageKey: passwordChangeErrorKey(error, 'code') })
    } finally { setBusy(false) }
  }

  async function resend() {
    if (!challenge || resendIn > 0) return
    setBusy(true)
    try {
      const result = await resendPasswordChangeCode(challenge.challenge_id)
      setChallenge(result)
      setResendIn(result.resend_after)
      setFeedback(null)
    } catch (error) {
      setFeedback({ type: 'error', messageKey: passwordChangeErrorKey(error, 'mail') })
    } finally { setBusy(false) }
  }

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    setCode((currentCode) => {
      const nextCode = [...currentCode]
      nextCode[index] = digit
      return nextCode
    })
    if (digit) document.getElementById(`password-code-${index + 1}`)?.focus()
  }

  return (
    <section className="max-w-3xl" id="account-security">
      <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)]">{t('security.title')}</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('security.description')}</p>

      <div className="mt-4 rounded-3xl border border-[var(--color-border)] bg-white p-4 shadow-sm sm:p-5">
        {step === 'idle' && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 items-start gap-3">
              <SecurityGlyph><LockIcon /></SecurityGlyph>
              <div className="min-w-0">
                <p className="font-extrabold text-[var(--color-text-primary)]">{t('security.password')}</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('security.passwordHelp')}</p>
              </div>
            </div>
            <button className="min-h-11 w-full shrink-0 rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-white sm:w-auto" onClick={() => { setStep('form'); setFeedback(null) }} type="button">{t('security.change')}</button>
          </div>
        )}

        {step === 'form' && (
          <form className="max-w-md" onSubmit={submitForm}>
            <div className="mb-5 flex items-start gap-3">
              <SecurityGlyph><LockIcon /></SecurityGlyph>
              <div>
                <p className="font-extrabold">{t('security.password')}</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('security.passwordHelp')}</p>
              </div>
            </div>
            <div className="grid gap-4">
              <PasswordField error={fieldErrors.current} id="current-password" label={t('security.current')} onChange={setCurrent} onToggle={() => toggle('current')} value={current} visible={visible.current} />
              <PasswordField error={fieldErrors.next} id="new-password" label={t('security.next')} onChange={setNext} onToggle={() => toggle('next')} value={next} visible={visible.next} />
              <PasswordField error={fieldErrors.confirm} id="confirm-password" label={t('security.confirm')} onChange={setConfirm} onToggle={() => toggle('confirm')} value={confirm} visible={visible.confirm} />
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{t('security.rules')}</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="min-h-11 rounded-full border border-[var(--color-border)] px-5 font-bold" onClick={closeFlow} type="button">{t('security.cancel')}</button>
              <button className="min-h-11 rounded-full bg-[var(--color-primary)] px-5 font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? t('security.working') : t('security.continue')}</button>
            </div>
            <ContextualFeedback feedback={feedback} />
          </form>
        )}

        {step === 'verify' && challenge && (
          <form className="max-w-md" onSubmit={submitCode}>
            <div className="flex items-start gap-3">
              <SecurityGlyph><MailIcon /></SecurityGlyph>
              <div>
                <h3 className="text-lg font-extrabold">{t('security.verifyTitle')}</h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('security.verifyBody', { email: challenge.masked_email })}</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('security.expires')}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {code.map((digit, index) => (
                <input
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  className="size-11 rounded-2xl border border-[var(--color-border)] text-center text-lg font-extrabold focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100 sm:size-12"
                  id={`password-code-${index}`}
                  inputMode="numeric"
                  key={index}
                  maxLength={1}
                  onChange={(event) => updateDigit(index, event.target.value)}
                  value={digit}
                />
              ))}
            </div>
            {fieldErrors.code && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.code}</p>}
            <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
              {t('security.didntReceive')}{' '}
              <button className="font-bold text-[var(--color-primary)] disabled:opacity-50" disabled={busy || resendIn > 0} onClick={() => void resend()} type="button">
                {resendIn > 0 ? t('security.resendIn', { seconds: resendIn }) : t('security.resend')}
              </button>
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button className="min-h-11 rounded-full border border-[var(--color-border)] px-5 font-bold" onClick={closeFlow} type="button">{t('security.back')}</button>
              <button className="min-h-11 rounded-full bg-[var(--color-primary)] px-5 font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? t('security.working') : t('security.verifyAction')}</button>
            </div>
            <ContextualFeedback feedback={feedback} />
          </form>
        )}

        {step === 'success' && (
          <div className="max-w-md">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--color-success-surface)] text-emerald-800"><CheckIcon /></span>
              <div>
                <h3 className="font-extrabold text-emerald-800">{t('security.successTitle')}</h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('security.successBody')}</p>
              </div>
            </div>
            <button className="mt-5 min-h-11 w-full rounded-full bg-[var(--color-primary)] px-5 font-bold text-white sm:w-auto" onClick={closeFlow} type="button">{t('security.done')}</button>
          </div>
        )}
      </div>
    </section>
  )
}

function SecurityGlyph({ children }: { children: ReactNode }) {
  return <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-surface)] text-[var(--color-primary)]">{children}</span>
}

function PasswordField({ id, label, value, onChange, visible, onToggle, error }: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggle: () => void
  error?: string
}) {
  const { t } = useTranslation()
  return (
    <label className="font-semibold">{label}
      <span className="relative mt-2 block">
        <input autoComplete={id.includes('current') ? 'current-password' : 'new-password'} className={`${fieldClass} pe-12`} id={id} onChange={(event) => onChange(event.target.value)} type={visible ? 'text' : 'password'} value={value} />
        <button aria-label={t(visible ? 'auth.login.hidePassword' : 'auth.login.showPassword')} className="absolute inset-e-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-[var(--color-text-secondary)]" onClick={onToggle} type="button"><EyeIcon visible={visible} /></button>
      </span>
      {error && <span className="mt-1 block text-sm font-normal text-red-700">{error}</span>}
    </label>
  )
}
