import { getLocales } from 'expo-localization'
import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { platformStorage } from '@/services/platform-storage'
import { ar } from './resources/ar'
import { en } from './resources/en'

export const supportedLanguages = ['en', 'ar'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]
const LANGUAGE_KEY = 'medaccess_mobile_language'
const deviceLanguage: SupportedLanguage = getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en'
const i18n = createInstance()

export const i18nReady = platformStorage.read(LANGUAGE_KEY).then((stored) => {
  const initialLanguage: SupportedLanguage = stored === 'ar' || stored === 'en' ? stored : deviceLanguage
  return i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4', resources: { en, ar }, lng: initialLanguage, fallbackLng: 'en',
    supportedLngs: supportedLanguages, interpolation: { escapeValue: false },
  })
})

export async function changeAppLanguage(language: SupportedLanguage) {
  await platformStorage.write(LANGUAGE_KEY, language)
  await i18n.changeLanguage(language)
}

export const isRtlLanguage = (language: string) => language === 'ar'
export default i18n
