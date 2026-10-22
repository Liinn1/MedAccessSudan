import { useRouter } from 'expo-router'
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { LanguageToggle } from '@/components/language-toggle'
import { useAppLanguage } from '@/hooks/use-app-language'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

export function WelcomeScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isRTL } = useAppLanguage()
  const direction = isRTL ? styles.rtl : styles.ltr

  return <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
    <View pointerEvents="none" style={styles.decoration}><View style={styles.orbTop} /><View style={styles.orbBottom} /></View>
    <ScrollView contentContainerStyle={styles.content}>
      <LanguageToggle />
      <View style={styles.hero}>
        <View style={styles.brandRow}><Image accessibilityIgnoresInvertColors resizeMode="contain" source={require('../../assets/images/medaccess-mark.png')} style={styles.logo} /><View><Text style={styles.brand}>MedAccess</Text><Text style={styles.country}>Sudan</Text></View></View>
        <Text style={[styles.title, direction, isRTL && arabicFonts.extraBold]}>{t('auth.welcome.title')}</Text>
        <Text style={[styles.description, direction, isRTL && arabicFonts.regular]}>{t('auth.welcome.description')}</Text>
        <View style={styles.professionalVisual}><View style={styles.visualOrbLarge} /><View style={styles.visualOrbSmall} /><Image accessibilityIgnoresInvertColors resizeMode="contain" source={require('../../assets/images/auth/healthcare-provider.png')} style={styles.professionalImage} /></View>
        <View style={styles.indicators}><View style={styles.indicatorActive} /><View style={styles.indicator} /><View style={styles.indicator} /></View>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/account-type')} style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}>
          <Text style={[styles.primaryText, isRTL && arabicFonts.bold]}>{t('auth.welcome.getStarted')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}>
          <Text style={[styles.secondaryText, isRTL && arabicFonts.bold]}>{t('auth.welcome.haveAccount')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.primarySurface, flex: 1 }, decoration: { bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 0 },
  orbTop: { backgroundColor: '#CCFBF1', borderRadius: 999, height: 240, position: 'absolute', right: -110, top: -80, width: 240 },
  orbBottom: { backgroundColor: colors.successSurface, borderRadius: 999, bottom: -130, height: 280, left: -130, position: 'absolute', width: 280 },
  content: { flexGrow: 1, justifyContent: 'space-between', padding: spacing.lg }, hero: { alignItems: 'stretch', paddingTop: spacing.md }, brandRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  logo: { height: 58, width: 58 }, brand: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  country: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  title: { color: colors.textPrimary, fontSize: 31, fontWeight: '800', lineHeight: 39, marginTop: spacing.xl, maxWidth: 300 },
  description: { color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginTop: spacing.sm, maxWidth: 360 },
  professionalVisual: { alignSelf: 'center', height: 255, marginTop: spacing.md, overflow: 'hidden', position: 'relative', width: '100%' }, visualOrbLarge: { backgroundColor: '#CCFBF1', borderRadius: 999, bottom: -92, height: 310, position: 'absolute', right: -48, width: 310 }, visualOrbSmall: { backgroundColor: '#E6FAF7', borderRadius: 999, height: 118, left: -20, position: 'absolute', top: 34, width: 118 }, professionalImage: { bottom: -52, height: 310, position: 'absolute', right: 8, width: 255 }, indicators: { alignSelf: 'center', flexDirection: 'row', gap: 7, marginTop: spacing.sm }, indicator: { backgroundColor: colors.border, borderRadius: 4, height: 7, width: 7 }, indicatorActive: { backgroundColor: colors.primary, borderRadius: 4, height: 7, width: 7 },
  ltr: { writingDirection: 'ltr' }, rtl: { writingDirection: 'rtl' }, actions: { gap: 12 },
  button: { alignItems: 'center', borderRadius: radii.md, justifyContent: 'center', minHeight: 56, paddingHorizontal: spacing.lg },
  primary: { backgroundColor: colors.primary }, secondary: { backgroundColor: colors.white, borderColor: colors.primary, borderWidth: 1.5 }, pressed: { opacity: 0.76 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '700' }, secondaryText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
})
