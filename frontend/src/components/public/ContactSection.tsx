import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import customerCareImage from '../../assets/public-home/customer-care.jpg'
import { SupportIcon } from '../icons/PatientHomeIcons'
import { BotanicalDecoration } from './BotanicalDecoration'
import { Reveal } from './Reveal'

type ContactFieldName = 'name' | 'email' | 'subject' | 'message'
type ContactErrors = Record<ContactFieldName, boolean>
type ContactMessage = 'validation' | 'unavailable' | ''

const contactLimits = {
  name: 100,
  email: 254,
  subject: 150,
  message: 2000,
} as const

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const formStatusId = 'contact-form-status'

/**
 * Validates contact details for immediate feedback. No endpoint is configured,
 * so valid submissions remain local and report that delivery is unavailable.
 * A future Laravel endpoint must repeat validation and enforce request limits.
 */
export function ContactSection() {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<ContactErrors>({
    name: false,
    email: false,
    subject: false,
    message: false,
  })
  const [messageKey, setMessageKey] = useState<ContactMessage>('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const name = String(values.get('name') ?? '').trim()
    const email = String(values.get('email') ?? '').trim()
    const subject = String(values.get('subject') ?? '').trim()
    const message = String(values.get('message') ?? '').trim()
    const nextErrors: ContactErrors = {
      name: !name || name.length > contactLimits.name,
      email: !emailPattern.test(email) || email.length > contactLimits.email,
      subject: !subject || subject.length > contactLimits.subject,
      message: message.length < 10 || message.length > contactLimits.message,
    }
    const hasErrors = Object.values(nextErrors).some(Boolean)

    setErrors(nextErrors)
    setMessageKey(hasErrors ? 'validation' : 'unavailable')
  }

  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <section className="relative bg-[#fffaf2] pb-18 pt-16" id="contact">
      <div className="mx-auto grid max-w-7xl gap-7 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10">
        <Reveal className="public-contact-visual relative overflow-hidden rounded-[2rem] bg-white shadow-[0_16px_45px_rgb(15_118_110/0.1)]">
          <img
            alt={t('publicHome.contact.imageAlt')}
            className="h-full min-h-[22rem] w-full object-cover object-left"
            loading="lazy"
            src={customerCareImage}
          />
          <BotanicalDecoration variant="contact" />
        </Reveal>

        <Reveal delay={100} direction="inline">
          <div className="grid h-full gap-6 rounded-[2rem] border border-teal-100 bg-white p-6 shadow-[0_16px_45px_rgb(15_118_110/0.08)] sm:p-8">
            <div>
              <p className="public-eyebrow">{t('publicHome.contact.eyebrow')}</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{t('publicHome.contact.title')}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                {t('publicHome.contact.description')}
              </p>
            </div>

            <form noValidate onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <ContactField
                  autoComplete="name"
                  error={errors.name}
                  label={t('publicHome.contact.fields.name')}
                  maxLength={contactLimits.name}
                  name="name"
                />
                <ContactField
                  autoComplete="email"
                  error={errors.email}
                  label={t('publicHome.contact.fields.email')}
                  maxLength={contactLimits.email}
                  name="email"
                  type="email"
                />
              </div>
              <ContactField
                error={errors.subject}
                label={t('publicHome.contact.fields.subject')}
                maxLength={contactLimits.subject}
                name="subject"
              />
              <label className="mt-4 block text-sm font-bold">
                {t('publicHome.contact.fields.message')}
                <textarea
                  aria-describedby={errors.message ? formStatusId : undefined}
                  aria-invalid={errors.message || undefined}
                  className="mt-2 min-h-28 w-full resize-y rounded-xl border border-[var(--color-border)] bg-slate-50 px-4 py-3 outline-none focus:border-[var(--color-primary)] focus:ring-3 focus:ring-teal-100"
                  maxLength={contactLimits.message}
                  name="message"
                  required
                />
              </label>
              <button
                className="mt-5 min-h-12 w-full rounded-xl bg-[var(--color-primary)] px-6 font-extrabold text-white shadow-sm"
                type="submit"
              >
                {t('publicHome.contact.send')}
              </button>
              <p
                aria-live="polite"
                className={`mt-3 min-h-5 text-sm font-semibold ${hasErrors ? 'text-red-700' : 'text-amber-700'}`}
                id={formStatusId}
              >
                {messageKey ? t(`publicHome.contact.${messageKey}`) : ''}
              </p>
            </form>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="flex items-center gap-2 font-extrabold">
                <SupportIcon className="size-5 text-[var(--color-primary)]" />
                {t('publicHome.contact.otherWays')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {t('publicHome.contact.otherWaysPending')}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

interface ContactFieldProps {
  autoComplete?: 'email' | 'name'
  error: boolean
  label: string
  maxLength: number
  name: Exclude<ContactFieldName, 'message'>
  type?: 'email' | 'text'
}

function ContactField({
  autoComplete,
  error,
  label,
  maxLength,
  name,
  type = 'text',
}: ContactFieldProps) {
  return (
    <label className="mt-4 block text-sm font-bold">
      {label}
      <input
        aria-describedby={error ? formStatusId : undefined}
        aria-invalid={error || undefined}
        autoComplete={autoComplete}
        className="mt-2 min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-slate-50 px-4 outline-none focus:border-[var(--color-primary)] focus:ring-3 focus:ring-teal-100"
        maxLength={maxLength}
        name={name}
        required
        type={type}
      />
    </label>
  )
}
