import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { arTranslation } from './ar/translation'
import { enTranslation } from './en/translation'

export const supportedLanguages = ['en', 'ar'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

const languageStorageKey = 'medaccess.language'

function isSupportedLanguage(language: string | null): language is SupportedLanguage {
  return supportedLanguages.some((supportedLanguage) => supportedLanguage === language)
}

function applyDocumentLanguage(language: SupportedLanguage): void {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
}

const storedLanguage = localStorage.getItem(languageStorageKey)
const initialLanguage: SupportedLanguage = isSupportedLanguage(storedLanguage)
  ? storedLanguage
  : 'en'

applyDocumentLanguage(initialLanguage)

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
    ar: { translation: arTranslation },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: supportedLanguages,
  interpolation: {
    // React escapes rendered values, so i18next must not escape them twice.
    escapeValue: false,
  },
})

i18n.on('languageChanged', (language) => {
  if (!isSupportedLanguage(language)) return

  localStorage.setItem(languageStorageKey, language)
  applyDocumentLanguage(language)
})

export default i18n
