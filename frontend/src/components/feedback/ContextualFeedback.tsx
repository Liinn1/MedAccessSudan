import { useTranslation } from 'react-i18next'

export type ContextualFeedbackState = {
  type: 'loading' | 'success' | 'error'
  messageKey: string
} | null

export function ContextualFeedback({ feedback }: { feedback: ContextualFeedbackState }) {
  const { t } = useTranslation()

  if (!feedback) return <div aria-hidden="true" className="min-h-6" />

  const appearance = feedback.type === 'error'
    ? 'bg-red-50 text-red-700'
    : feedback.type === 'success'
      ? 'bg-[var(--color-success-surface)] text-emerald-800'
      : 'bg-[var(--color-primary-surface)] text-[var(--color-primary)]'

  return <p aria-live="polite" aria-busy={feedback.type === 'loading'} className={`feedback-enter mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold motion-reduce:animate-none ${appearance}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
    {feedback.type === 'loading' && <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-e-transparent motion-reduce:animate-none" />}
    {t(feedback.messageKey)}
  </p>
}
