import { useTranslation } from 'react-i18next'
import {
  supportedLanguages,
  type SupportedLanguage,
} from '../i18n'

const languageTranslationKeys = {
  en: 'language.english',
  ar: 'language.arabic',
} as const

/**
 * Global, keyboard-accessible language selector.
 * Changing language updates the current React tree without a page reload.
 */
export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const activeLanguage: SupportedLanguage = i18n.resolvedLanguage === 'ar' ? 'ar' : 'en'

  return (
    <div
      aria-label={t('language.selectorLabel')}
      className="inline-flex rounded-full border border-[var(--color-border)] bg-white p-1"
      role="group"
    >
      {supportedLanguages.map((language) => {
        const isActive = activeLanguage === language

        return (
          <button
            aria-pressed={isActive}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
              isActive
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-surface)]'
            }`}
            key={language}
            lang={language}
            onClick={() => void i18n.changeLanguage(language)}
            type="button"
          >
            {t(languageTranslationKeys[language])}
          </button>
        )
      })}
    </div>
  )
}
