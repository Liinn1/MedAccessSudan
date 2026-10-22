import { Pressable, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { useAppLanguage } from '@/hooks/use-app-language'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

type LanguageToggleProps = { compact?: boolean }

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { t } = useTranslation()
  const { language, isRTL, shouldMirrorLayout, setLanguage } = useAppLanguage()
  return <View accessibilityRole="tablist" style={[styles.container, shouldMirrorLayout && styles.reverse]}>
    {(['en', 'ar'] as const).map((option) => {
      const selected = language === option
      return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={option}
        onPress={() => void setLanguage(option)} style={({ pressed }) => [styles.option, compact && styles.compactOption, selected && styles.selected, pressed && styles.pressed]}>
        <Text style={[styles.label, compact && styles.compactLabel, selected && styles.selectedLabel, isRTL && arabicFonts.semiBold]}>{option === 'en' ? t('common.english') : t('common.arabic')}</Text>
      </Pressable>
    })}
  </View>
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', backgroundColor: colors.disabled, borderRadius: radii.pill, flexDirection: 'row', padding: spacing.xs },
  reverse: { flexDirection: 'row-reverse' }, option: { borderRadius: radii.pill, minWidth: 92, paddingHorizontal: spacing.md, paddingVertical: 10 },
  compactOption: { minWidth: 62, paddingHorizontal: 10, paddingVertical: 8 },
  selected: { backgroundColor: colors.white }, pressed: { opacity: 0.72 },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', textAlign: 'center' }, selectedLabel: { color: colors.primary },
  compactLabel: { fontSize: 12 },
})
