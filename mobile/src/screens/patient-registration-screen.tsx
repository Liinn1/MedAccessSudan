import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
import { resendEmailVerification, type PatientRegistrationInput } from '@/services/auth-service'

type Field = keyof PatientRegistrationInput
type FieldErrors = Partial<Record<Field, string>>

const initialForm: PatientRegistrationInput = {
  first_name: '', last_name: '', email: '', phone: '', password: '', password_confirmation: '',
}

export function PatientRegistrationScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isRTL } = useAppLanguage()
  const { register } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [verificationMessage, setVerificationMessage] = useState('')
  const direction = isRTL ? styles.rtl : styles.ltr

  function update(field: Field, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (!form.first_name.trim()) next.first_name = t('auth.register.errors.required')
    if (!form.last_name.trim()) next.last_name = t('auth.register.errors.required')
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = t('auth.register.errors.email')
    if (!/^\+?[0-9]{7,15}$/.test(form.phone.replace(/[\s()-]/g, ''))) next.phone = t('auth.register.errors.phone')
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) next.password = t('auth.register.errors.password')
    if (form.password_confirmation !== form.password) next.password_confirmation = t('auth.register.errors.confirmation')
    return next
  }

  async function submit() {
    if (busy) return
    const clientErrors = validate()
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); return }
    setBusy(true); setFormError('')
    try {
      await register({
        first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(),
        phone: form.phone.trim(), password: form.password, password_confirmation: form.password_confirmation,
      })
      setRegisteredEmail(form.email.trim())
      setForm(initialForm)
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && error.validationErrors) {
        const serverErrors: FieldErrors = {}
        for (const field of Object.keys(initialForm) as Field[]) {
          if (!error.validationErrors[field]?.[0]) continue
          if (field === 'email') serverErrors[field] = t('auth.register.errors.emailExists')
          else if (field === 'phone') serverErrors[field] = t('auth.register.errors.phoneExists')
          else if (field === 'password' || field === 'password_confirmation') serverErrors[field] = t('auth.register.errors.passwordRejected')
          else serverErrors[field] = t('auth.register.errors.invalid')
        }
        setErrors(serverErrors)
        setFormError(t('auth.register.errors.correctFields'))
      } else if (error instanceof ApiError && error.status === 429) setFormError(t('auth.register.errors.tooMany'))
      else if (error instanceof ApiError && (error.code === 'network' || error.code === 'configuration')) setFormError(t('auth.register.errors.network'))
      else setFormError(t('auth.register.errors.unavailable'))
    } finally { setBusy(false) }
  }

  if (registeredEmail) return <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
    <View style={styles.successContent}>
      <View pointerEvents="none" style={styles.celebration}><View style={[styles.dot, styles.dotOne]} /><View style={[styles.dot, styles.dotTwo]} /><View style={[styles.dot, styles.dotThree]} /></View>
      <View style={styles.successIcon}><MaterialIcon color={colors.white} name="check" size={54} /></View>
      <Text style={[styles.successTitle, direction, isRTL && arabicFonts.extraBold]}>{t('auth.register.successTitle')}</Text>
      <Text style={[styles.description, direction, isRTL && arabicFonts.regular]}>{t('auth.register.successDescription', { email: registeredEmail })}</Text>
      {!!verificationMessage && <Text accessibilityLiveRegion="polite" style={[styles.verificationMessage, direction, isRTL && arabicFonts.regular]}>{verificationMessage}</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={async () => {
        if (busy) return
        setBusy(true); setVerificationMessage('')
        try { await resendEmailVerification(registeredEmail); setVerificationMessage(t('auth.register.verificationResent')) }
        catch { setVerificationMessage(t('auth.register.errors.verificationUnavailable')) }
        finally { setBusy(false) }
      }} style={({ pressed }) => [styles.secondaryButton, (pressed || busy) && styles.pressed]}>
        <Text style={[styles.secondaryButtonText, isRTL && arabicFonts.bold]}>{busy ? t('auth.register.submitting') : t('auth.register.resendVerification')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/login')} style={styles.submit}>
        <Text style={[styles.submitText, isRTL && arabicFonts.bold]}>{t('auth.register.goToLogin')}</Text>
      </Pressable>
    </View>
  </SafeAreaView>

  return <KeyboardAwareForm contentContainerStyle={styles.content} safeAreaStyle={styles.safeArea}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.back()}><Text style={[styles.back, isRTL && arabicFonts.bold]}>{t('common.back')}</Text></Pressable>
          <LanguageToggle compact />
        </View>
        <View style={styles.card}>
          <Text style={[styles.title, direction, isRTL && arabicFonts.extraBold]}>{t('auth.register.title')}</Text>
          <Text style={[styles.description, direction, isRTL && arabicFonts.regular]}>{t('auth.register.description')}</Text>
          <RegistrationField autoComplete="given-name" error={errors.first_name} field="first_name" keyboardType="default" label={t('auth.register.firstName')} onChange={update} value={form.first_name} />
          <RegistrationField autoComplete="family-name" error={errors.last_name} field="last_name" keyboardType="default" label={t('auth.register.lastName')} onChange={update} value={form.last_name} />
          <RegistrationField autoCapitalize="none" autoComplete="email" error={errors.email} field="email" keyboardType="email-address" label={t('auth.register.email')} onChange={update} value={form.email} />
          <RegistrationField autoComplete="tel" error={errors.phone} field="phone" keyboardType="phone-pad" label={t('auth.register.phone')} onChange={update} value={form.phone} />
          <PasswordField error={errors.password} field="password" label={t('auth.register.password')} onChange={update} value={form.password} visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />
          <PasswordField error={errors.password_confirmation} field="password_confirmation" label={t('auth.register.confirmPassword')} onChange={update} value={form.password_confirmation} visible={confirmationVisible} onToggle={() => setConfirmationVisible((value) => !value)} />
          <Text style={[styles.rules, direction, isRTL && arabicFonts.regular]}>{t('auth.register.passwordRules')}</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.formError, direction, isRTL && arabicFonts.regular]}>{formError}</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={({ pressed }) => [styles.submit, (pressed || busy) && styles.pressed]}>
            <Text style={[styles.submitText, isRTL && arabicFonts.bold]}>{busy ? t('auth.register.submitting') : t('auth.register.submit')}</Text>
          </Pressable>
          <Pressable accessibilityRole="link" disabled={busy} onPress={() => router.replace('/login')}>
            <Text style={[styles.loginLink, isRTL && arabicFonts.semiBold]}>{t('auth.register.haveAccount')}</Text>
          </Pressable>
        </View>
  </KeyboardAwareForm>
}

function RegistrationField({ error, field, label, onChange, value, ...inputProps }: {
  error?: string; field: Field; label: string; onChange: (field: Field, value: string) => void; value: string
} & Pick<React.ComponentProps<typeof TextInput>, 'autoCapitalize' | 'autoComplete' | 'keyboardType'>) {
  const { isRTL } = useAppLanguage(); const direction = isRTL ? styles.rtl : styles.ltr
  return <View><Text style={[styles.label, direction, isRTL && arabicFonts.bold]}>{label}</Text>
    <TextInput editable {...inputProps} onChangeText={(text) => onChange(field, text)} style={[styles.input, direction, isRTL && arabicFonts.regular, error && styles.inputError]} value={value} />
    {!!error && <Text style={[styles.fieldError, direction, isRTL && arabicFonts.regular]}>{error}</Text>}</View>
}

function PasswordField({ error, field, label, onChange, onToggle, value, visible }: {
  error?: string; field: Field; label: string; onChange: (field: Field, value: string) => void; onToggle: () => void; value: string; visible: boolean
}) {
  const { isRTL } = useAppLanguage(); const direction = isRTL ? styles.rtl : styles.ltr
  return <View><Text style={[styles.label, direction, isRTL && arabicFonts.bold]}>{label}</Text>
    <View style={[styles.passwordField, error && styles.inputError]}><TextInput autoComplete="new-password" onChangeText={(text) => onChange(field, text)} secureTextEntry={!visible} style={[styles.passwordInput, direction, isRTL && arabicFonts.regular]} value={value} />
      <PasswordVisibilityButton onPress={onToggle} visible={visible} />
    </View>{!!error && <Text style={[styles.fieldError, direction, isRTL && arabicFonts.regular]}>{error}</Text>}</View>
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.primarySurface, flex: 1 }, content: { padding: spacing.lg },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, back: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: 2, marginTop: spacing.lg, padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 27, fontWeight: '800', lineHeight: 37 }, description: { color: colors.textSecondary, fontSize: 14, lineHeight: 23, marginBottom: spacing.md, marginTop: spacing.xs },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 6, marginTop: spacing.sm },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 15, minHeight: 50, paddingHorizontal: spacing.md },
  inputError: { borderColor: colors.danger }, fieldError: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 3 },
  passwordField: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row' },
  passwordInput: { color: colors.textPrimary, flex: 1, fontSize: 15, minHeight: 48, paddingHorizontal: spacing.md }, rules: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  formError: { color: colors.danger, fontSize: 13, lineHeight: 19, minHeight: 28, paddingTop: spacing.sm }, submit: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, justifyContent: 'center', minHeight: 54, paddingHorizontal: spacing.lg },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' }, pressed: { opacity: 0.72 }, loginLink: { color: colors.primary, fontSize: 14, fontWeight: '600', paddingTop: spacing.md, textAlign: 'center' },
  successContent: { flex: 1, justifyContent: 'center', padding: spacing.lg, position: 'relative' }, successIcon: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primary, borderRadius: radii.pill, height: 96, justifyContent: 'center', width: 96 }, celebration: { alignSelf: 'center', height: 140, position: 'absolute', top: '23%', width: 220 }, dot: { borderRadius: 6, height: 9, position: 'absolute', width: 9 }, dotOne: { backgroundColor: '#3B82F6', left: 18, top: 48 }, dotTwo: { backgroundColor: '#FBBF24', right: 24, top: 66 }, dotThree: { backgroundColor: '#10B981', right: 52, top: 12 }, successTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', lineHeight: 38, textAlign: 'center' },
  verificationMessage: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: spacing.md }, secondaryButton: { alignItems: 'center', borderColor: colors.primary, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center', marginTop: spacing.lg, minHeight: 52 }, secondaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  ltr: { textAlign: 'left', writingDirection: 'ltr' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
})
