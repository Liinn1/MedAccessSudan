import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text'
import { LanguageToggle } from '@/components/language-toggle'
import { PasswordVisibilityButton } from '@/components/password-visibility-button'
import { SettingsScreen } from '@/components/patient/settings-screen'
import { MaterialIcon } from '@/components/material-icon'
import { useAppLanguage } from '@/hooks/use-app-language'
import { confirmPasswordChange, startPasswordChange } from '@/services/auth-service'
import { defaultNotificationPreferences, loadNotificationPreferences, saveNotificationPreferences, type NotificationPreferences } from '@/services/notification-preference-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'
import { useAuth } from '@/providers/auth-provider'
import { ApiError } from '@/api/client'
import { submitSupportQuery } from '@/services/support-service'

const faqGroups = [
  ['gettingStarted', ['what', 'create', 'update']], ['appointments', ['bookClinic', 'viewAppointments', 'homeVisit', 'confirmed']], ['laboratory', ['bookLab', 'homeCollection', 'viewLabs']], ['security', ['password', 'photo', 'language']], ['support', ['help']],
] as const

const doctorFaqGroups = [
  ['verification', ['verification', 'pending']],
  ['practice', ['profile', 'availability', 'appointments', 'appointmentActions', 'homeVisits']],
  ['account', ['photo', 'location', 'language', 'password', 'support']],
] as const

const laboratoryFaqGroups = [
  ['verification', ['verification', 'pending']],
  ['operations', ['profile', 'tests', 'requests', 'requestActions', 'homeCollection', 'collectionMethod', 'results']],
  ['account', ['photo', 'location', 'language', 'password', 'support']],
] as const

export function PatientNotificationsScreen() {
  const { t } = useTranslation(); const { isRTL, shouldMirrorLayout } = useAppLanguage()
  const [preferences, setPreferences] = useState(defaultNotificationPreferences); const [loaded, setLoaded] = useState(false)
  useEffect(() => { void loadNotificationPreferences().then((value) => { setPreferences(value); setLoaded(true) }) }, [])
  async function toggle(key: keyof NotificationPreferences) { const next = { ...preferences, [key]: !preferences[key] }; setPreferences(next); await saveNotificationPreferences(next) }
  return <SettingsScreen description={t('patient.settings.notifications.description')} title={t('patient.settings.menu.notifications')}>
    <Text style={[styles.note, isRTL && styles.rtl]}>{t('patient.settings.notifications.foundation')}</Text>
    <View style={styles.surface}>{(['push', 'confirmations', 'reminders', 'changes', 'homeVisits', 'laboratory'] as const).map((key, index) => <View key={key} style={[styles.settingRow, shouldMirrorLayout && styles.reverse, index > 0 && styles.divider]}><View style={styles.grow}><Text style={[styles.rowTitle, isRTL && styles.rtl, isRTL && arabicFonts.bold]}>{t(`patient.settings.notifications.items.${key}.title`)}</Text><Text style={[styles.rowDescription, isRTL && styles.rtl, isRTL && arabicFonts.regular]}>{t(`patient.settings.notifications.items.${key}.description`)}</Text></View><Switch accessibilityLabel={t(`patient.settings.notifications.items.${key}.title`)} disabled={!loaded} onValueChange={() => void toggle(key)} thumbColor={colors.white} trackColor={{ false: colors.disabled, true: colors.primary }} value={preferences[key]} /></View>)}</View>
  </SettingsScreen>
}

export function PatientLanguageScreen() { const { t } = useTranslation(); return <SettingsScreen description={t('patient.settings.languageDescription')} title={t('patient.settings.menu.language')}><View style={styles.centerSurface}><LanguageToggle /></View></SettingsScreen> }

export function PatientFaqScreen() {
  const { t } = useTranslation(); const { user } = useAuth(); const { isRTL, shouldMirrorLayout } = useAppLanguage(); const [open, setOpen] = useState('')
  const role = user?.role === 'doctor' || user?.role === 'laboratory' ? user.role : 'patient'
  const namespace = role === 'patient' ? 'patient.settings.faq' : `${role}.faq`
  const groups = role === 'doctor' ? doctorFaqGroups : role === 'laboratory' ? laboratoryFaqGroups : faqGroups
  return <SettingsScreen description={t(`${namespace}.description`)} title={t('patient.settings.menu.faq')}>{groups.map(([group, questions]) => <View key={group}><Text style={[styles.groupLabel, isRTL && styles.rtl, isRTL && arabicFonts.bold]}>{t(`${namespace}.groups.${group}`)}</Text><View style={styles.surface}>{questions.map((key, index) => { const itemKey = `${group}.${key}`; const expanded = open === itemKey; return <Pressable accessibilityRole="button" accessibilityState={{ expanded }} key={key} onPress={() => setOpen(expanded ? '' : itemKey)} style={({ pressed }) => [styles.faqRow, index > 0 && styles.divider, pressed && styles.pressed]}><View style={[styles.faqQuestion, shouldMirrorLayout && styles.reverse]}><Text style={[styles.rowTitle, styles.grow, isRTL && styles.rtl, isRTL && arabicFonts.bold]}>{t(`${namespace}.items.${key}.question`)}</Text><MaterialIcon color={colors.primary} name={expanded ? 'remove' : 'add'} size={22} /></View>{expanded && <Text style={[styles.answer, isRTL && styles.rtl, isRTL && arabicFonts.regular]}>{t(`${namespace}.items.${key}.answer`)}</Text>}</Pressable> })}</View></View>)}</SettingsScreen>
}

export function PatientHelpScreen() {
  const { t } = useTranslation(); const router = useRouter(); const { user } = useAuth(); const { isRTL, shouldMirrorLayout } = useAppLanguage()
  const [subject, setSubject] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('')
  const faqRoute = user?.role === 'doctor' ? '/(doctor)/profile/faq' : user?.role === 'laboratory' ? '/(laboratory)/profile/faq' : '/(patient)/profile/faq'
  async function submit() {
    setError(''); setSuccess('')
    const cleanSubject = subject.trim(); const cleanMessage = message.trim()
    if (!cleanSubject || cleanSubject.length > 150) { setError(t('patient.settings.help.subjectError')); return }
    if (cleanMessage.length < 10 || cleanMessage.length > 2000) { setError(t('patient.settings.help.messageError')); return }
    if (!user?.name || !user.email) { setError(t('patient.settings.help.sessionError')); return }
    setBusy(true)
    try { await submitSupportQuery({ name: user.name, email: user.email, subject: cleanSubject, message: cleanMessage }); setSubject(''); setMessage(''); setSuccess(t('patient.settings.help.success')) }
    catch (caught) { const status = caught instanceof ApiError ? caught.status : undefined; setError(t(status === 422 ? 'patient.settings.help.validationError' : status === 401 ? 'patient.settings.help.sessionError' : status === 403 ? 'patient.settings.help.forbiddenError' : status === 429 ? 'patient.settings.help.rateError' : caught instanceof ApiError && caught.code === 'network' ? 'patient.settings.help.networkError' : 'patient.settings.help.serverError')) }
    finally { setBusy(false) }
  }
  return <SettingsScreen description={t('patient.settings.help.description')} title={t('patient.settings.menu.help')}><Pressable accessibilityRole="button" onPress={() => router.push(faqRoute as never)} style={({ pressed }) => [styles.linkRow, shouldMirrorLayout && styles.reverse, pressed && styles.pressed]}><MaterialIcon color={colors.primary} name="help" size={25} /><View style={styles.grow}><Text style={[styles.rowTitle, isRTL && styles.rtl, isRTL && arabicFonts.bold]}>{t('patient.settings.menu.faq')}</Text><Text style={[styles.rowDescription, isRTL && styles.rtl, isRTL && arabicFonts.regular]}>{t('patient.settings.help.faqHint')}</Text></View><MaterialIcon color={colors.textMuted} name={isRTL ? 'chevron_left' : 'chevron_right'} /></Pressable><View style={[styles.surface, styles.form]}><View style={[styles.supportHeading, shouldMirrorLayout && styles.reverse]}><MaterialIcon color={colors.primary} name="support_agent" size={28} /><View style={styles.grow}><Text style={[styles.rowTitle, isRTL && styles.rtl, isRTL && arabicFonts.bold]}>{t('patient.settings.help.formTitle')}</Text><Text style={[styles.rowDescription, isRTL && styles.rtl, isRTL && arabicFonts.regular]}>{t('patient.settings.help.sendingAs', { email: user?.email ?? '' })}</Text></View></View><View><Text style={[styles.label, isRTL && styles.rtl, isRTL && arabicFonts.bold]}>{t('patient.settings.help.subject')}</Text><TextInput editable={!busy} maxLength={150} onChangeText={setSubject} placeholder={t('patient.settings.help.subjectPlaceholder')} style={[styles.supportInput, isRTL && styles.rtl, isRTL && arabicFonts.regular]} value={subject} /></View><View><Text style={[styles.label, isRTL && styles.rtl, isRTL && arabicFonts.bold]}>{t('patient.settings.help.message')}</Text><TextInput editable={!busy} maxLength={2000} multiline onChangeText={setMessage} placeholder={t('patient.settings.help.messagePlaceholder')} style={[styles.supportInput, styles.messageInput, isRTL && styles.rtl, isRTL && arabicFonts.regular]} textAlignVertical="top" value={message} /></View>{!!error && <Text accessibilityLiveRegion="polite" style={[styles.error, isRTL && arabicFonts.regular]}>{error}</Text>}{!!success && <Text accessibilityLiveRegion="polite" style={[styles.supportSuccess, isRTL && arabicFonts.regular]}>{success}</Text>}<Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={({ pressed }) => [styles.action, (pressed || busy) && styles.pressed]}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.actionText, isRTL && arabicFonts.bold]}>{t('patient.settings.help.submit')}</Text>}</Pressable></View></SettingsScreen>
}

export const PatientAboutScreen = () => <InformationScreen icon="health_and_safety" section="about" />
export const PatientPrivacyScreen = () => <InformationScreen icon="privacy_tip" section="privacy" />
function InformationScreen({ icon, section }: { icon: string; section: 'about' | 'privacy' }) { const { t } = useTranslation(); const { isRTL } = useAppLanguage(); return <SettingsScreen description={t(`patient.settings.${section}.description`)} title={t(`patient.settings.menu.${section}`)}><View style={styles.infoCard}><MaterialIcon color={colors.primary} name={icon} size={38} /><Text style={[styles.answer, isRTL && styles.rtl, isRTL && arabicFonts.regular]}>{t(`patient.settings.${section}.body`)}</Text></View></SettingsScreen> }

export function PatientSecurityScreen() {
  const { t } = useTranslation(); const { isRTL } = useAppLanguage(); const [step, setStep] = useState<'password' | 'code' | 'success'>('password'); const [current, setCurrent] = useState(''); const [next, setNext] = useState(''); const [confirmation, setConfirmation] = useState(''); const [code, setCode] = useState(''); const [challenge, setChallenge] = useState(''); const [visible, setVisible] = useState<Record<string, boolean>>({}); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  async function start() { setError(''); if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next) || next !== confirmation || !current) { setError(t('patient.settings.security.validation')); return } setBusy(true); try { const result = await startPasswordChange({ current_password: current, password: next, password_confirmation: confirmation }); setChallenge(result.challenge_id); setStep('code') } catch { setError(t('patient.settings.security.error')) } finally { setBusy(false) } }
  async function confirm() { if (!/^\d{6}$/.test(code)) { setError(t('patient.settings.security.codeValidation')); return } setBusy(true); setError(''); try { await confirmPasswordChange(challenge, code); setStep('success'); setCurrent(''); setNext(''); setConfirmation(''); setCode('') } catch { setError(t('patient.settings.security.codeError')) } finally { setBusy(false) } }
  const field = (key: string, value: string, setValue: (value: string) => void) => <View><Text style={[styles.label, isRTL && styles.rtl]}>{t(`patient.settings.security.${key}`)}</Text><View style={styles.passwordField}><TextInput onChangeText={setValue} secureTextEntry={!visible[key]} style={[styles.passwordInput, isRTL && styles.rtl]} value={value} /><PasswordVisibilityButton onPress={() => setVisible((state) => ({ ...state, [key]: !state[key] }))} visible={Boolean(visible[key])} /></View></View>
  return <SettingsScreen description={t('patient.settings.security.description')} title={t('patient.settings.menu.security')}><View style={[styles.surface, styles.form]}>{step === 'password' ? <>{field('current', current, setCurrent)}{field('new', next, setNext)}{field('confirm', confirmation, setConfirmation)}<Text style={[styles.rowDescription, isRTL && styles.rtl]}>{t('auth.register.passwordRules')}</Text><Action busy={busy} label={t('patient.settings.security.continue')} onPress={start} /></> : step === 'code' ? <><Text style={[styles.answer, isRTL && styles.rtl]}>{t('patient.settings.security.codeHelp')}</Text><TextInput keyboardType="number-pad" maxLength={6} onChangeText={setCode} style={[styles.input, isRTL && styles.rtl]} value={code} /><Action busy={busy} label={t('patient.settings.security.confirmAction')} onPress={confirm} /></> : <View style={styles.success}><MaterialIcon color={colors.success} name="check_circle" size={42} /><Text style={styles.rowTitle}>{t('patient.settings.security.success')}</Text></View>}{!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}</View></SettingsScreen>
}
function Action({ busy, label, onPress }: { busy: boolean; label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={({ pressed }) => [styles.action, (pressed || busy) && styles.pressed]}><Text style={styles.actionText}>{label}</Text></Pressable> }

const styles = StyleSheet.create({ surface: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' }, centerSurface: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, padding: spacing.xl }, settingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 74, padding: spacing.md }, reverse: { flexDirection: 'row-reverse' }, grow: { flex: 1, minWidth: 0 }, divider: { borderTopColor: colors.border, borderTopWidth: 1 }, rowTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', lineHeight: 21 }, rowDescription: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginTop: 2 }, note: { backgroundColor: colors.primarySurface, borderRadius: radii.md, color: colors.textSecondary, fontSize: 12, lineHeight: 20, padding: spacing.md }, rtl: { textAlign: 'right', writingDirection: 'rtl' }, groupLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: .6, marginBottom: 7, marginTop: spacing.sm, paddingHorizontal: 4, textTransform: 'uppercase' }, faqRow: { padding: spacing.md }, faqQuestion: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, answer: { color: colors.textSecondary, fontSize: 14, lineHeight: 23, marginTop: spacing.sm }, pressed: { opacity: .7 }, linkRow: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 70, padding: spacing.md }, infoCard: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, padding: spacing.xl }, form: { gap: spacing.md, padding: spacing.md }, label: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 6 }, passwordField: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row' }, passwordInput: { color: colors.textPrimary, flex: 1, minHeight: 50, paddingHorizontal: spacing.md }, input: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 17, letterSpacing: 5, minHeight: 52, paddingHorizontal: spacing.md }, action: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.pill, minHeight: 50, justifyContent: 'center' }, actionText: { color: colors.white, fontWeight: '700' }, error: { color: colors.danger, fontSize: 13, textAlign: 'center' }, success: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl }, supportHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, supportInput: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 14, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, messageInput: { minHeight: 140 }, supportSuccess: { color: colors.success, fontSize: 13, textAlign: 'center' },
})
