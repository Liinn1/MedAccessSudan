import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PublicLayout } from '../../layouts/PublicLayout'

export function ProviderComingSoonPage() {
  const { t } = useTranslation()
  const feature = t('publicHome.footer.groups.providers.two')

  return (
    <PublicLayout>
      <section className="mx-auto max-w-lg px-5 py-16 text-center sm:px-8">
        <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)]">{feature}</h1>
        <p className="mt-3 font-semibold text-[var(--color-primary)]">{t('publicHome.comingSoon')}</p>
        <p className="mt-3 leading-relaxed text-[var(--color-text-secondary)]">{t('publicHome.footer.comingSoonDescription', { feature })}</p>
        <Link className="mt-8 inline-block font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]" to="/">{t('auth.backHome')}</Link>
      </section>
    </PublicLayout>
  )
}
