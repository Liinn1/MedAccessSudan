import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/client'
import { KeyboardAwareForm } from '@/components/forms/keyboard-aware-form'
import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text'
import { PasswordVisibilityButton } from '@/components/password-visibility-button'
import { useAppLanguage } from '@/hooks/use-app-language'
import { completePasswordReset, requestPasswordReset, resendPasswordReset } from '@/services/auth-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

type Step = 'email' | 'code' | 'password' | 'success'

export function ForgotPasswordScreen() {
  const router = useRouter(); const { t } = useTranslation(); const { isRTL } = useAppLanguage()
  const [step, setStep] = useState<Step>('email'); const [email, setEmail] = useState(''); const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [info, setInfo] = useState(''); const [visible, setVisible] = useState(false)
  const direction = isRTL ? styles.rtl : styles.ltr

  function friendlyError(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 429) return t('auth.forgot.tooMany')
    if (cause instanceof ApiError && cause.status === 422) return t('auth.forgot.invalid')
    if (cause instanceof ApiError && (cause.code === 'network' || cause.code === 'configuration')) return t('auth.forgot.network')
    return t('auth.forgot.unavailable')
  }

  async function sendCode() {
    if (busy) return
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError(t('auth.forgot.emailInvalid')); return }
    setBusy(true); setError('')
    try { const response = await requestPasswordReset(email.trim()); setChallengeId(response.data.challenge_id); setInfo(t('auth.forgot.sent')); setStep('code') }
    catch (cause) { setError(friendlyError(cause)) } finally { setBusy(false) }
  }

  async function resend() {
    if (busy || !challengeId) return
    setBusy(true); setError('')
    try { await resendPasswordReset(email.trim(), challengeId); setInfo(t('auth.forgot.sent')) }
    catch (cause) { setError(friendlyError(cause)) } finally { setBusy(false) }
  }

  async function resetPassword() {
    if (busy) return
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) { setError(t('auth.register.errors.password')); return }
    if (password !== confirmation) { setError(t('auth.register.errors.confirmation')); return }
    setBusy(true); setError('')
    try { await completePasswordReset({ email: email.trim(), challenge_id: challengeId, code, password, password_confirmation: confirmation }); setPassword(''); setConfirmation(''); setCode(''); setStep('success') }
    catch (cause) { setError(friendlyError(cause)) } finally { setBusy(false) }
  }

  return <KeyboardAwareForm contentContainerStyle={styles.content} safeAreaStyle={styles.safeArea}><View style={styles.card}>
      <Text style={[styles.title, direction, isRTL && arabicFonts.extraBold]}>{t('auth.forgot.title')}</Text>
      {step === 'email' && <><Text style={[styles.description, direction, isRTL && arabicFonts.regular]}>{t('auth.forgot.help')}</Text>
        <Field keyboardType="email-address" label={t('auth.forgot.email')} onChange={setEmail} value={email} />
        <Action busy={busy} label={busy ? t('auth.forgot.working') : t('auth.forgot.send')} onPress={sendCode} /></>}
      {step === 'code' && <><Text style={[styles.info, direction, isRTL && arabicFonts.regular]}>{info}</Text>
        <Text style={[styles.description, direction, isRTL && arabicFonts.regular]}>{t('auth.forgot.codeHelp', { email })}</Text>
        <Field keyboardType="number-pad" label={t('auth.forgot.code')} maxLength={6} onChange={(value) => setCode(value.replace(/\D/g, ''))} value={code} />
        <Action busy={busy} label={t('auth.forgot.continue')} onPress={() => { if (/^\d{6}$/.test(code)) { setError(''); setStep('password') } else setError(t('auth.forgot.codeInvalid')) }} />
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void resend()}><Text style={[styles.link, isRTL && arabicFonts.semiBold]}>{t('auth.forgot.resend')}</Text></Pressable></>}
      {step === 'password' && <><PasswordInput label={t('auth.forgot.newPassword')} onChange={setPassword} onToggle={() => setVisible((value) => !value)} value={password} visible={visible} />
        <PasswordInput label={t('auth.forgot.confirmPassword')} onChange={setConfirmation} onToggle={() => setVisible((value) => !value)} value={confirmation} visible={visible} />
        <Text style={[styles.description, direction, isRTL && arabicFonts.regular]}>{t('auth.register.passwordRules')}</Text>
        <Action busy={busy} label={busy ? t('auth.forgot.working') : t('auth.forgot.submit')} onPress={resetPassword} /></>}
      {step === 'success' && <><Text style={[styles.info, direction, isRTL && arabicFonts.regular]}>{t('auth.forgot.success')}</Text>
        <Action busy={false} label={t('auth.forgot.login')} onPress={() => router.replace('/login')} /></>}
      {!!error && <Text accessibilityLiveRegion="polite" style={[styles.error, direction, isRTL && arabicFonts.regular]}>{error}</Text>}
      {step !== 'success' && <Pressable accessibilityRole="link" disabled={busy} onPress={() => router.back()}><Text style={[styles.link, isRTL && arabicFonts.semiBold]}>{t('common.back')}</Text></Pressable>}
    </View></KeyboardAwareForm>
}

function Field({ keyboardType, label, maxLength, onChange, value }: { keyboardType: 'email-address' | 'number-pad'; label: string; maxLength?: number; onChange: (value: string) => void; value: string }) {
  const { isRTL } = useAppLanguage(); const direction = isRTL ? styles.rtl : styles.ltr
  return <View><Text style={[styles.label, direction, isRTL && arabicFonts.bold]}>{label}</Text><TextInput autoCapitalize="none" keyboardType={keyboardType} maxLength={maxLength} onChangeText={onChange} style={[styles.input, direction, isRTL && arabicFonts.regular]} value={value} /></View>
}

function PasswordInput({ label, onChange, onToggle, value, visible }: { label: string; onChange: (value: string) => void; onToggle: () => void; value: string; visible: boolean }) {
  const { isRTL } = useAppLanguage(); const direction = isRTL ? styles.rtl : styles.ltr
  return <View><Text style={[styles.label, direction, isRTL && arabicFonts.bold]}>{label}</Text><View style={styles.passwordField}><TextInput autoComplete="new-password" onChangeText={onChange} secureTextEntry={!visible} style={[styles.passwordInput, direction, isRTL && arabicFonts.regular]} value={value} /><PasswordVisibilityButton onPress={onToggle} visible={visible} /></View></View>
}

function Action({ busy, label, onPress }: { busy: boolean; label: string; onPress: () => void | Promise<void> }) {
  const { isRTL } = useAppLanguage(); return <Pressable accessibilityRole="button" disabled={busy} onPress={() => void onPress()} style={({ pressed }) => [styles.submit, (pressed || busy) && styles.pressed]}><Text style={[styles.submitText, isRTL && arabicFonts.bold]}>{label}</Text></Pressable>
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.primarySurface, flex: 1 }, content: { justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.lg }, title: { color: colors.textPrimary, fontSize: 27, fontWeight: '800', lineHeight: 37 },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 }, label: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: spacing.sm },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.md },
  passwordField: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row' }, passwordInput: { color: colors.textPrimary, flex: 1, fontSize: 16, minHeight: 50, paddingHorizontal: spacing.md },
  submit: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, justifyContent: 'center', marginTop: spacing.sm, minHeight: 52 }, submitText: { color: colors.white, fontSize: 15, fontWeight: '700' }, pressed: { opacity: 0.72 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600', paddingVertical: spacing.sm, textAlign: 'center' }, error: { color: colors.danger, fontSize: 13, lineHeight: 20 }, info: { backgroundColor: colors.successSurface, borderRadius: radii.sm, color: '#047857', fontSize: 13, lineHeight: 20, padding: spacing.md },
  ltr: { textAlign: 'left', writingDirection: 'ltr' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
})
