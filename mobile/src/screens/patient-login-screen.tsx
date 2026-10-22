import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/client'
import { KeyboardAwareForm } from '@/components/forms/keyboard-aware-form'
import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text'
import { LanguageToggle } from '@/components/language-toggle'
import { MaterialIcon } from '@/components/material-icon'
import { PasswordVisibilityButton } from '@/components/password-visibility-button'
import { useAppLanguage } from '@/hooks/use-app-language'
import { useAuth } from '@/providers/auth-provider'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

export function PatientLoginScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isRTL } = useAppLanguage()
  const { login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [remember, setRemember] = useState(true)
  const direction = isRTL ? styles.rtl : styles.ltr

  async function submit() {
    if (!identifier.trim() || !password) { setError(t('auth.login.required')); return }
    setBusy(true); setError('')
    try { await login(identifier.trim(), password, remember) }
    catch (cause) {
      if (!(cause instanceof ApiError)) setError(t('auth.login.error'))
      else if (cause.backendCode === 'INVALID_CREDENTIALS' || cause.status === 422) setError(t('auth.login.invalidCredentials'))
      else if (cause.backendCode === 'ACCOUNT_SUSPENDED') setError(t('auth.login.suspended'))
      else if (cause.backendCode === 'EMAIL_UNVERIFIED') setError(t('auth.login.unverified'))
      else if (cause.backendCode === 'TOO_MANY_ATTEMPTS' || cause.status === 429) setError(t('auth.login.tooManyAttempts'))
      else if (cause.code === 'network' || cause.code === 'configuration') setError(t('auth.login.networkError'))
      else setError(t('auth.login.error'))
    }
    finally { setBusy(false) }
  }

  return <KeyboardAwareForm contentContainerStyle={styles.content} safeAreaStyle={styles.safeArea}>
        <View style={styles.top}><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={[styles.back, isRTL && arabicFonts.bold]}>{t('common.back')}</Text></Pressable><LanguageToggle compact /></View>
        <View style={styles.brandBlock}><Image accessibilityIgnoresInvertColors resizeMode="contain" source={require('../../assets/images/medaccess-mark.png')} style={styles.logo} /><View><Text style={styles.brandName}>MedAccess</Text><Text style={styles.brandCountry}>Sudan</Text></View></View>
        <View style={styles.card}>
          <Text style={[styles.title, direction, isRTL && arabicFonts.extraBold]}>{t('auth.login.title')}</Text>
          <Text style={[styles.description, direction, isRTL && arabicFonts.regular]}>{t('auth.login.description')}</Text>
          <Text style={[styles.label, direction, isRTL && arabicFonts.bold]}>{t('auth.login.identifier')}</Text>
          <TextInput autoCapitalize="none" autoComplete="email" autoCorrect={false} editable={!busy} onChangeText={setIdentifier}
            placeholder={t('auth.login.identifierPlaceholder')} style={[styles.input, direction, isRTL && arabicFonts.regular]} value={identifier} />
          <Text style={[styles.label, direction, isRTL && arabicFonts.bold]}>{t('auth.login.password')}</Text>
          <View style={styles.passwordField}>
            <TextInput autoCapitalize="none" autoComplete="current-password" autoCorrect={false} editable={!busy} onChangeText={setPassword}
              placeholder={t('auth.login.passwordPlaceholder')} secureTextEntry={!passwordVisible}
              spellCheck={false} style={[styles.passwordInput, direction, isRTL && arabicFonts.regular]} value={password} />
            <PasswordVisibilityButton disabled={busy} onPress={() => setPasswordVisible((visible) => !visible)} visible={passwordVisible} />
          </View>
          <Text accessibilityLiveRegion="polite" style={[styles.error, direction, isRTL && arabicFonts.regular]}>{error}</Text>
          <View style={styles.secondaryActions}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember }} disabled={busy} onPress={() => setRemember((value) => !value)} style={styles.remember}>
              <MaterialIcon color={remember ? colors.primary : colors.textMuted} name={remember ? 'check_box' : 'check_box_outline_blank'} size={21} />
              <Text style={[styles.rememberText, isRTL && arabicFonts.regular]}>{t('auth.login.rememberMe')}</Text>
            </Pressable>
            <Pressable accessibilityRole="link" disabled={busy} onPress={() => router.push('/forgot-password')}>
              <Text style={[styles.secondaryLink, isRTL && arabicFonts.semiBold]}>{t('auth.login.forgotPassword')}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()}
            style={({ pressed }) => [styles.submit, (pressed || busy) && styles.pressed]}>
            <Text style={[styles.submitText, isRTL && arabicFonts.bold]}>{busy ? t('auth.login.signingIn') : t('auth.login.submit')}</Text>
          </Pressable>
          <Pressable accessibilityRole="link" disabled={busy} onPress={() => router.push('/account-type')}>
            <Text style={[styles.createLink, isRTL && arabicFonts.semiBold]}>{t('auth.login.noAccount')} <Text style={styles.createAccent}>{t('auth.login.createAccount')}</Text></Text>
          </Pressable>
        </View>
  </KeyboardAwareForm>
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.primarySurface }, content: { flexGrow: 1, padding: spacing.lg },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, back: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  brandBlock: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: spacing.lg }, logo: { height: 62, width: 62 }, brandName: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' }, brandCountry: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  card: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, marginTop: spacing.xl, padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', lineHeight: 38 }, description: { color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginBottom: spacing.lg, marginTop: spacing.sm },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 7, marginTop: spacing.md },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.md },
  passwordField: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row' },
  passwordInput: { color: colors.textPrimary, flex: 1, fontSize: 16, minHeight: 50, paddingHorizontal: spacing.md },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, minHeight: 40, paddingTop: spacing.sm },
  secondaryActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.md }, remember: { alignItems: 'center', flexDirection: 'row', gap: 5 }, rememberText: { color: colors.textSecondary, fontSize: 13 },
  secondaryLink: { color: colors.primary, fontSize: 13, fontWeight: '600', paddingVertical: spacing.sm },
  createLink: { color: colors.textSecondary, fontSize: 13, paddingTop: spacing.lg, textAlign: 'center' }, createAccent: { color: colors.primary, fontWeight: '700' },
  submit: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, justifyContent: 'center', minHeight: 54 }, pressed: { opacity: 0.72 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' }, ltr: { textAlign: 'left', writingDirection: 'ltr' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
})
