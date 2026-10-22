import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { LanguageToggle } from '@/components/language-toggle'
import { MaterialIcon } from '@/components/material-icon'
import { useAppLanguage } from '@/hooks/use-app-language'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

const roles = [
  { key: 'patient', route: '/register', icon: 'person', color: '#0D9488', surface: '#E6FAF7' },
  { key: 'doctor', route: '/register-doctor', icon: 'medical_services', color: '#0284C7', surface: '#E8F5FD' },
  { key: 'laboratory', route: '/register-laboratory', icon: 'science', color: '#7C3AED', surface: '#F2ECFF' },
] as const

export function AccountTypeScreen() {
  const router = useRouter(); const { t } = useTranslation(); const { isRTL, shouldMirrorLayout } = useAppLanguage()
  const direction = isRTL ? styles.rtl : styles.ltr
  return <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}><ScrollView contentContainerStyle={styles.content}>
    <View style={[styles.top, shouldMirrorLayout && styles.rowReverse]}><Pressable accessibilityRole="button" onPress={() => router.back()}><MaterialIcon color={colors.textPrimary} name={isRTL ? 'arrow_forward' : 'arrow_back'} /></Pressable><LanguageToggle compact /></View>
    <Text style={[styles.title, direction, isRTL && arabicFonts.extraBold]}>{t('auth.accountType.title')}</Text>
    <Text style={[styles.description, direction, isRTL && arabicFonts.regular]}>{t('auth.accountType.description')}</Text>
    <View style={styles.cards}>{roles.map((role) => <Pressable accessibilityRole="button" key={role.key} onPress={() => router.push(role.route)} style={({ pressed }) => [styles.card, { backgroundColor: role.surface }, shouldMirrorLayout && styles.rowReverse, pressed && styles.pressed]}>
      <View style={styles.icon}><MaterialIcon color={role.color} name={role.icon} size={36} /></View>
      <View style={styles.copy}><Text style={[styles.cardTitle, direction, isRTL && arabicFonts.bold]}>{t(`auth.accountType.${role.key}.title`)}</Text><Text style={[styles.cardDescription, direction, isRTL && arabicFonts.regular]}>{t(`auth.accountType.${role.key}.description`)}</Text></View>
      <MaterialIcon color={colors.textPrimary} name={isRTL ? 'chevron_left' : 'chevron_right'} />
    </Pressable>)}</View>
  </ScrollView></SafeAreaView>
}

const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, content: { flexGrow: 1, padding: spacing.lg }, top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, title: { color: colors.textPrimary, fontSize: 29, fontWeight: '800', lineHeight: 39, marginTop: spacing.xl }, description: { color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginTop: spacing.xs }, cards: { gap: spacing.md, marginTop: spacing.xl }, card: { alignItems: 'center', borderRadius: radii.lg, flexDirection: 'row', gap: spacing.md, minHeight: 112, padding: spacing.md }, icon: { alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.pill, height: 62, justifyContent: 'center', width: 62 }, copy: { flex: 1 }, cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }, cardDescription: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 }, pressed: { opacity: .72 }, rowReverse: { flexDirection: 'row-reverse' }, ltr: { textAlign: 'left', writingDirection: 'ltr' }, rtl: { textAlign: 'right', writingDirection: 'rtl' } })
