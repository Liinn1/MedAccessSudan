import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import healthcareProviderImage from '../../assets/auth/healthcare-provider.png'
import { HomeIcon } from '../icons/PatientHomeIcons'
import { PageBackgroundDecorations } from '../layout/PageBackgroundDecorations'
import { BotanicalDecoration } from '../public/BotanicalDecoration'

interface AuthShellProps {
  children: ReactNode
  title: string
  subtitle: string
  eyebrow?: string
  spacious?: boolean
  variant?: 'login' | 'registration'
  layout?: 'default' | 'patient'
}

/**
 * Shared public authentication chrome. Form stays first in the DOM (and left on
 * desktop). Below the lg breakpoint, CSS paints the same visual as a compact
 * header above the form instead of hiding it or stacking the desktop column.
 */
export function AuthShell({ children, title, subtitle, eyebrow, spacious = false, variant = 'login', layout = 'default' }: AuthShellProps) {
  const { t } = useTranslation()
  const visualKind = layout === 'patient' ? 'patient' : variant === 'registration' ? 'doctor' : 'login'

  return (
    <div className={`auth-page auth-page--${variant} relative isolate overflow-clip px-4 sm:px-6 lg:px-8`}>
      <PageBackgroundDecorations />

      <section className={`auth-shell auth-shell--${variant}${layout === 'patient' ? ' auth-shell--patient' : ''} relative z-10 mx-auto grid w-full overflow-hidden border border-white/80 bg-white shadow-[0_24px_70px_rgb(15_118_110/0.12)] ${spacious ? 'max-w-[84rem]' : 'max-w-[72rem]'}`}>
        <div className={`auth-form-panel auth-form-panel--${variant} min-w-0 bg-[#fffdf9] px-5 py-5 sm:px-8 sm:py-7 lg:px-9 lg:py-7 xl:px-11`}>
          <header className="auth-form-enter max-w-xl text-start">
            {eyebrow && (
              <p className="auth-form-eyebrow text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                {eyebrow}
              </p>
            )}
            <h1 className="auth-form-title mt-1 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              {title}
            </h1>
            <p className="auth-form-subtitle mt-1.5 max-w-xl leading-relaxed text-[var(--color-text-secondary)]">{subtitle}</p>
          </header>
          <div className="auth-form-content mt-5">{children}</div>
          <Link
            className="auth-home-link mt-3 inline-flex min-h-10 items-center justify-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            to="/"
          >
            <HomeIcon className="size-4" />
            {t('auth.backHome')}
          </Link>
        </div>

        <AuthVisualPanel kind={visualKind} />
      </section>
    </div>
  )
}

function AuthVisualPanel({ kind }: { kind: 'login' | 'patient' | 'doctor' }) {
  const { t } = useTranslation()

  return (
    <aside className={`auth-visual auth-visual--${kind} relative isolate overflow-hidden bg-[#eefaf6]`}>
      <div className="auth-visual-stage">
        {/* Artwork is direction-locked so Arabic cannot remirror leaves or the photograph. */}
        <div className="auth-visual-art" dir="ltr">
          <span aria-hidden="true" className="auth-organic-shape" />
          <BotanicalDecoration className="auth-botanical auth-botanical--rear" variant="auth" />
          <div className="auth-visual-portrait">
            <img
              alt={t('auth.visual.imageAlt')}
              className="auth-visual-image"
              decoding="async"
              fetchPriority="high"
              loading="eager"
              src={healthcareProviderImage}
            />
          </div>
          <BotanicalDecoration className="auth-botanical auth-botanical--front" variant="authForeground" />
        </div>
        <AuthForegroundWave />
        <p className="auth-visual-note public-hand-note">
          {t('publicHome.hero.note')}
          <span aria-hidden="true" className="auth-visual-note__mark">♡</span>
        </p>
      </div>
    </aside>
  )
}

/** Scalable SVG: preserveAspectRatio none stretches the curves with the visual panel. */
function AuthForegroundWave() {
  return (
    <svg
      aria-hidden="true"
      className="auth-foreground-wave"
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 800 140"
    >
      <path
        className="auth-foreground-wave__mint"
        d="M0 54C88 22 168 86 258 52C348 18 428 78 518 46C608 16 698 64 800 34V140H0Z"
      />
      <path
        className="auth-foreground-wave__cream"
        d="M0 72C108 44 186 98 286 68C386 38 464 96 564 66C654 40 732 82 800 58V140H0Z"
      />
    </svg>
  )
}
