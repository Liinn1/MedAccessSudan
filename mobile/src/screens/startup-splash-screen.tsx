import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { i18nReady } from '@/i18n'
import { colors, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'
import { useAppLanguage } from '@/hooks/use-app-language'
import { useAuth } from '@/providers/auth-provider'

export function StartupSplashScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isRTL } = useAppLanguage()
  const { status, user } = useAuth()
  const [startupReady, setStartupReady] = useState(false)
  const [animationFinished, setAnimationFinished] = useState(false)
  const hasNavigated = useRef(false)
  const [logoOpacity] = useState(() => new Animated.Value(0))
  const [logoScale] = useState(() => new Animated.Value(0.96))
  const [nameOpacity] = useState(() => new Animated.Value(0))
  const [taglineOpacity] = useState(() => new Animated.Value(0))
  const [indicatorOpacity] = useState(() => new Animated.Value(0))

  useEffect(() => {
    let active = true
    void i18nReady.finally(() => {
      if (active) setStartupReady(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active) return
      if (reduceMotion) {
        logoOpacity.setValue(1)
        logoScale.setValue(1)
        nameOpacity.setValue(1)
        taglineOpacity.setValue(1)
        indicatorOpacity.setValue(1)
        setAnimationFinished(true)
        return
      }

      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoOpacity, { duration: 420, toValue: 1, useNativeDriver: true }),
          Animated.timing(logoScale, { duration: 420, toValue: 1, useNativeDriver: true }),
        ]),
        Animated.timing(nameOpacity, { duration: 260, toValue: 1, useNativeDriver: true }),
        Animated.timing(taglineOpacity, { duration: 240, toValue: 1, useNativeDriver: true }),
        Animated.timing(indicatorOpacity, { duration: 180, toValue: 1, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (active && finished) setAnimationFinished(true)
      })
    })

    return () => { active = false }
  }, [indicatorOpacity, logoOpacity, logoScale, nameOpacity, taglineOpacity])

  const continueFromBootstrap = useCallback(() => {
    if (hasNavigated.current) return
    hasNavigated.current = true
    const destination = status !== 'authenticated'
      ? '/welcome'
      : user?.role === 'patient'
        ? '/(patient)/home'
        : user?.role === 'doctor'
          ? '/(doctor)/home'
          : '/(laboratory)/home'
    router.replace(destination)
  }, [router, status, user?.role])

  useEffect(() => {
    if (startupReady && animationFinished && status !== 'bootstrapping') continueFromBootstrap()
  }, [animationFinished, continueFromBootstrap, startupReady, status])

  return <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
    <StatusBar style="dark" />
    <View accessibilityElementsHidden pointerEvents="none" style={styles.decorations}>
      <View style={[styles.shape, styles.topShape]} />
      <View style={[styles.shape, styles.bottomShape]} />
      <View style={styles.ring} />
    </View>

    <View style={styles.content}>
      <View style={styles.centerpiece}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={t('common.appName')}
            resizeMode="contain"
            source={require('../../assets/images/medaccess-mark.png')}
            style={styles.logo}
          />
        </Animated.View>
        <Animated.View style={[styles.brandBlock, { opacity: nameOpacity }]}>
          <Text style={styles.brandName}>MedAccess</Text>
          <Text style={styles.country}>SUDAN</Text>
        </Animated.View>
        <Animated.Text style={[styles.tagline, isRTL && arabicFonts.regular, { opacity: taglineOpacity }]}>
          {t('splash.tagline')}
        </Animated.Text>
      </View>

      <Animated.View accessibilityLabel={t('splash.loading')} accessibilityRole="progressbar"
        style={[styles.loading, { opacity: indicatorOpacity }]}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={[styles.loadingText, isRTL && arabicFonts.medium]}>{t('splash.loading')}</Text>
      </Animated.View>
    </View>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.primarySurface, flex: 1 },
  decorations: { bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 0 },
  shape: { backgroundColor: colors.successSurface, borderRadius: 999, position: 'absolute' },
  topShape: { height: 280, right: -130, top: -112, width: 280 },
  bottomShape: { bottom: -155, height: 340, left: -170, width: 340 },
  ring: { borderColor: '#CCFBF1', borderRadius: 999, borderWidth: 22, height: 142, opacity: 0.62, position: 'absolute', right: -72, top: '56%', width: 142 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'space-between', paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  centerpiece: { alignItems: 'center', flex: 1, justifyContent: 'center', width: '100%' },
  logo: { height: 142, width: 142 },
  brandBlock: { alignItems: 'center', marginTop: spacing.md },
  brandName: { color: '#0B5B7E', fontSize: 30, fontWeight: '800', letterSpacing: -0.8, lineHeight: 34 },
  country: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 2.8, marginTop: 1 },
  tagline: { color: colors.textSecondary, fontSize: 16, lineHeight: 24, marginTop: spacing.lg, maxWidth: 300, textAlign: 'center', writingDirection: 'auto' },
  loading: { alignItems: 'center', gap: spacing.sm, minHeight: 54 },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: '500', textAlign: 'center', writingDirection: 'auto' },
})
