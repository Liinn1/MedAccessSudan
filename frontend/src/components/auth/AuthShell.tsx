import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import healthcareProviderImage from '../../assets/auth/healthcare-provider.png'
import { BrandMark } from '../branding/BrandMark'
import { PageBackgroundDecorations } from '../layout/PageBackgroundDecorations'

interface AuthShellProps {
  children: ReactNode
  title: string
  subtitle: string
  eyebrow?: string
  spacious?: boolean
  variant?: 'login' | 'registration'
}

export function AuthShell({ children, title, subtitle, eyebrow, spacious = false, variant = 'login' }: AuthShellProps) {
  const { t } = useTranslation()

  return (
    <div className={`auth-page auth-page--${variant} relative isolate overflow-hidden px-4 sm:px-6 lg:px-8`}>
      <PageBackgroundDecorations />

      <section className={`auth-shell auth-shell--${variant} relative z-10 mx-auto grid w-full overflow-clip border border-teal-100 bg-white shadow-[0_24px_70px_rgb(15_118_110/0.12)] lg:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)] ${spacious ? 'max-w-[84rem]' : 'max-w-[72rem]'}`}>
        <aside className={`auth-visual auth-visual--${variant} relative isolate min-h-48 overflow-hidden bg-[#073B3A] px-6 pt-5 text-white sm:min-h-60 sm:px-8 sm:pt-6 lg:px-9 lg:pt-8`}>
          <div aria-hidden="true" className="absolute -start-24 -top-24 size-72 rounded-full bg-teal-300/15 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-28 -end-20 size-80 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="auth-visual-copy relative z-10 max-w-sm">
            <BrandMark variant="auth" />
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-teal-200">{t('auth.visual.eyebrow')}</p>
            <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">{t('auth.visual.title')}</h2>
            <p className="mt-2 hidden max-w-xs text-sm leading-relaxed text-teal-50/85 sm:block">{t('auth.visual.description')}</p>
          </div>
          <div className="auth-visual-portrait pointer-events-none absolute inset-x-0 bottom-0 z-0 flex items-end justify-center">
            <img alt={t('auth.visual.imageAlt')} className="auth-visual-image block h-full w-full object-contain object-bottom" decoding="async" fetchPriority="high" src={healthcareProviderImage} />
          </div>
        </aside>

        <div className={`auth-form-panel auth-form-panel--${variant} min-w-0 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9 xl:px-12`}>
          <header className="auth-form-enter max-w-2xl text-start">
            {eyebrow && <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--color-primary)]">{eyebrow}</p>}
            <h1 className="mt-1.5 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-text-secondary)]">{subtitle}</p>
          </header>
          <div className="auth-form-content mt-5">{children}</div>
        </div>
      </section>
    </div>
  )
}
