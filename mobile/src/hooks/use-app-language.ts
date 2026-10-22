import { useTranslation } from 'react-i18next'
import { I18nManager } from 'react-native'
import { changeAppLanguage, isRtlLanguage, type SupportedLanguage } from '@/i18n'

export function useAppLanguage() {
  const { i18n } = useTranslation()
  const language: SupportedLanguage = i18n.resolvedLanguage === 'ar' ? 'ar' : 'en'
  const isRTL = isRtlLanguage(language)
  return {
    language,
    isRTL,
    shouldMirrorLayout: isRTL !== I18nManager.isRTL,
    setLanguage: changeAppLanguage,
  }
}
