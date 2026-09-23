import { useId } from 'react'
import { useTranslation } from 'react-i18next'

interface LoadingStateProps {
  message?: string
  contained?: boolean
  section?: boolean
}

export function LoadingState({ message, contained = false, section = false }: LoadingStateProps) {
  const { t } = useTranslation()
  const gradientId = useId()

  return (
    <div aria-busy="true" className={`grid place-items-center bg-[var(--color-background)] px-5 ${section ? 'min-h-40 rounded-2xl' : contained ? 'min-h-[55dvh]' : 'min-h-dvh'}`}>
      <div className="page-enter flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
        <svg aria-hidden="true" className={`medaccess-loader-pulse ${section ? 'w-28' : 'w-36'}`} viewBox="0 0 160 56">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1">
              <stop offset="0" stopColor="#115E59" />
              <stop offset="0.5" stopColor="#0D9488" />
              <stop offset="1" stopColor="#2DD4BF" />
            </linearGradient>
          </defs>
          <path className="medaccess-loader-track" d="M4 30h35l8-15 12 31 13-42 13 40 10-25 8 11h53" />
          <path className="medaccess-loader-line" d="M4 30h35l8-15 12 31 13-42 13 40 10-25 8 11h53" stroke={`url(#${gradientId})`} />
        </svg>
        <p className="medaccess-loader-label text-sm font-semibold text-[var(--color-text-secondary)]">{message ?? t('common.loading')}</p>
      </div>
    </div>
  )
}
