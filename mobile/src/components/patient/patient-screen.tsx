import type { PropsWithChildren, ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { KeyboardAwareScrollView } from '@/components/forms/keyboard-aware-form'
import { MaterialIcon } from '@/components/material-icon'
import { useAppLanguage } from '@/hooks/use-app-language'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

export function PatientScreen({ title, subtitle, children, refreshControl }: PropsWithChildren<{ title: string; subtitle?: string; refreshControl?: ReactNode }>) {
  const { isRTL, shouldMirrorLayout } = useAppLanguage()
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
    {title ? <View style={[styles.header, shouldMirrorLayout && styles.reverse]}>
      <View style={styles.heading}>
        <Text style={[styles.title, isRTL && styles.rtl, isRTL && arabicFonts.extraBold]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, isRTL && styles.rtl, isRTL && arabicFonts.regular]}>{subtitle}</Text>}
      </View>
    </View> : null}
    <KeyboardAwareScrollView contentContainerStyle={styles.content} refreshControl={refreshControl as never} showsVerticalScrollIndicator={false}>
      {children}
    </KeyboardAwareScrollView>
  </SafeAreaView>
}

export function LoadState({ state, empty, onRetry }: { state: 'loading' | 'error' | 'empty'; empty?: string; onRetry: () => void }) {
  const { t } = useTranslation()
  const { isRTL } = useAppLanguage()
  if (state === 'loading') return <View accessibilityRole="progressbar" style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>{t('patient.common.loading')}</Text></View>
  return <View style={styles.state}>
    <MaterialIcon color={state === 'error' ? colors.danger : colors.textMuted} name={state === 'error' ? 'cloud_off' : 'inbox'} size={34} />
    <Text style={[styles.stateText, isRTL && styles.rtl, isRTL && arabicFonts.regular]}>{state === 'error' ? t('patient.common.error') : empty}</Text>
    {state === 'error' && <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><Text style={[styles.retryText, isRTL && arabicFonts.bold]}>{t('common.retry')}</Text></Pressable>}
  </View>
}

export const patientScreenStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row' },
  reverse: { flexDirection: 'row-reverse' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  ltr: { textAlign: 'left', writingDirection: 'ltr' },
  heading: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', lineHeight: 25 },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 21 },
  meta: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
})

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  reverse: { flexDirection: 'row-reverse' },
  heading: { flex: 1, minWidth: 0 },
  title: { color: colors.textPrimary, fontSize: 27, fontWeight: '800', lineHeight: 38 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 2 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  content: { gap: spacing.md, paddingBottom: spacing.xl, paddingHorizontal: spacing.md },
  state: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, justifyContent: 'center', minHeight: 180, padding: spacing.lg },
  stateText: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  retry: { backgroundColor: colors.primarySurface, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  retryText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.7 },
})
