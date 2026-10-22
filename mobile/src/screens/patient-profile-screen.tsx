import { useCallback, useState } from 'react'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text'
import { MaterialIcon } from '@/components/material-icon'
import { patientScreenStyles as shared } from '@/components/patient/patient-screen'
import { SettingsScreen } from '@/components/patient/settings-screen'
import { useAppLanguage } from '@/hooks/use-app-language'
import { useAuth } from '@/providers/auth-provider'
import { getPatientProfile, removePatientProfilePhoto, updatePatientProfile, updatePatientProfilePhoto } from '@/services/patient-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'
import { ProfileOverviewScreen } from '@/components/profile/profile-overview-screen'

type Busy = 'details' | 'photo' | 'remove' | ''

export function PatientProfileScreen() {
  const { t } = useTranslation()
  const account = [
    { path: '/(patient)/profile/personal-information', icon: 'person', label: t('patient.settings.menu.personalInformation') }, { path: '/(patient)/profile/security', icon: 'lock', label: t('patient.settings.menu.security') }, { path: '/(patient)/profile/notifications', icon: 'notifications', label: t('patient.settings.menu.notifications') }, { path: '/(patient)/profile/language-settings', icon: 'language', label: t('patient.settings.menu.language') },
  ] as const
  const support = [
    { path: '/(patient)/profile/faq', icon: 'help', label: t('patient.settings.menu.faq') }, { path: '/(patient)/profile/help-support', icon: 'support_agent', label: t('patient.settings.menu.help') }, { path: '/(patient)/profile/about-medaccess', icon: 'info', label: t('patient.settings.menu.about') }, { path: '/(patient)/profile/privacy-security', icon: 'privacy_tip', label: t('patient.settings.menu.privacy') },
  ] as const
  return <ProfileOverviewScreen account={account} identityPath="/(patient)/profile/personal-information" roleLabel={t('patient.profile.patient')} subtitle={t('patient.settings.subtitle')} support={support} title={t('patient.profile.title')} />
}

export function PatientPersonalInformationScreen() {
  const { t } = useTranslation()
  const { user, updateCurrentUser } = useAuth()
  const { isRTL, shouldMirrorLayout } = useAppLanguage()
  const [form, setForm] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', email: user?.email ?? '', phone: user?.phone ?? '' })
  const [busy, setBusy] = useState<Busy>('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const direction = shouldMirrorLayout ? shared.reverse : undefined
  const alignment = isRTL ? shared.rtl : shared.ltr

  useFocusEffect(useCallback(() => {
    let active = true
    void getPatientProfile().then((updated) => {
      if (!active) return
      updateCurrentUser(updated)
      setForm({ first_name: updated.first_name ?? '', last_name: updated.last_name ?? '', email: updated.email, phone: updated.phone ?? '' })
    }).catch(() => undefined)
    return () => { active = false }
  }, [updateCurrentUser]))

  function feedbackStart(next: Busy) { setBusy(next); setMessage(''); setError('') }
  async function choosePhoto() {
    setError('')
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) { setError(t('patient.profile.photoPermission')); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .8 })
    if (result.canceled) return
    const asset = result.assets[0]
    feedbackStart('photo')
    try {
      const updated = await updatePatientProfilePhoto({ uri: asset.uri, name: asset.fileName || `patient-profile-${Date.now()}.jpg`, type: asset.mimeType || 'image/jpeg' })
      updateCurrentUser(updated); setMessage(t('patient.profile.photoUpdated'))
    } catch { setError(t('patient.profile.photoError')) }
    finally { setBusy('') }
  }
  async function removePhoto() {
    feedbackStart('remove')
    try { const updated = await removePatientProfilePhoto(); updateCurrentUser(updated); setMessage(t('patient.profile.photoRemoved')) }
    catch { setError(t('patient.profile.photoError')) }
    finally { setBusy('') }
  }
  async function saveDetails() {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.phone.trim()) { setError(t('patient.profile.required')); return }
    feedbackStart('details')
    try {
      const updated = await updatePatientProfile({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(), phone: form.phone.trim() })
      updateCurrentUser(updated); setForm({ first_name: updated.first_name ?? '', last_name: updated.last_name ?? '', email: updated.email, phone: updated.phone ?? '' }); setMessage(t('patient.profile.updated'))
    } catch { setError(t('patient.profile.updateError')) }
    finally { setBusy('') }
  }

  return <SettingsScreen description={t('patient.profile.subtitle')} title={t('patient.settings.menu.personalInformation')}>
    <View style={[shared.card, styles.identity]}>
      {user?.profile_image_url ? <Image source={{ uri: user.profile_image_url }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.initials}>{initials(user?.name)}</Text></View>}
      <Text style={[styles.name, isRTL && arabicFonts.extraBold]}>{user?.name}</Text><Text style={[shared.body, isRTL && arabicFonts.regular]}>{t('patient.profile.patient')}</Text>
      <View style={[styles.photoActions, direction]}><Pressable accessibilityRole="button" disabled={busy !== ''} onPress={() => void choosePhoto()} style={({ pressed }) => [styles.photoButton, pressed && shared.pressed]}><MaterialIcon color={colors.primary} name="photo_camera" size={20} /><Text style={styles.photoButtonText}>{t(busy === 'photo' ? 'patient.profile.uploading' : 'patient.profile.changePhoto')}</Text></Pressable>{user?.profile_image_url && <Pressable accessibilityRole="button" disabled={busy !== ''} onPress={() => void removePhoto()} style={({ pressed }) => [styles.removeButton, pressed && shared.pressed]}><Text style={styles.removeText}>{t(busy === 'remove' ? 'patient.profile.removing' : 'patient.profile.removePhoto')}</Text></Pressable>}</View>
    </View>
    <View style={[shared.card, styles.form]}>
      <ProfileInput alignment={alignment} label={t('patient.profile.firstName')} onChangeText={(value) => setForm((current) => ({ ...current, first_name: value }))} value={form.first_name} />
      <ProfileInput alignment={alignment} label={t('patient.profile.lastName')} onChangeText={(value) => setForm((current) => ({ ...current, last_name: value }))} value={form.last_name} />
      <ProfileInput alignment={alignment} autoCapitalize="none" keyboardType="email-address" label={t('patient.profile.email')} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} value={form.email} />
      <ProfileInput alignment={alignment} keyboardType="phone-pad" label={t('patient.profile.phone')} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} value={form.phone} />
      <Pressable accessibilityRole="button" disabled={busy !== ''} onPress={() => void saveDetails()} style={({ pressed }) => [styles.save, pressed && shared.pressed]}><Text style={styles.saveText}>{t(busy === 'details' ? 'patient.profile.saving' : 'patient.profile.save')}</Text></Pressable>
    </View>
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text>}{!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
  </SettingsScreen>
}

function initials(name?: string) { return (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'P' }
function ProfileInput({ label, alignment, ...props }: { label: string; alignment: object; value: string; onChangeText: (value: string) => void; keyboardType?: 'email-address' | 'phone-pad'; autoCapitalize?: 'none' }) { return <View><Text style={[styles.label, alignment]}>{label}</Text><TextInput {...props} placeholder={label} placeholderTextColor={colors.textMuted} style={[styles.input, alignment]} /></View> }

const styles = StyleSheet.create({
  identityGateway: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, gatewayAvatar: { borderRadius: 34, height: 68, width: 68 }, gatewayFallback: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: 34, height: 68, justifyContent: 'center', width: 68 }, gatewayInitials: { color: colors.primary, fontSize: 22, fontWeight: '800' }, gatewayName: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' }, sectionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: .7, marginBottom: 8, paddingHorizontal: 4, textTransform: 'uppercase' }, menu: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' }, menuRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 58, paddingHorizontal: spacing.md }, menuLabel: { color: colors.textPrimary, flex: 1, fontSize: 14, fontWeight: '600' }, divider: { borderTopColor: colors.border, borderTopWidth: 1 }, overlay: { alignItems: 'center', backgroundColor: '#0F172A66', flex: 1, justifyContent: 'center', padding: spacing.lg }, dialog: { backgroundColor: colors.white, borderRadius: radii.lg, gap: spacing.sm, maxWidth: 380, padding: spacing.lg, width: '100%' }, dialogTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' }, dialogActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.sm }, cancel: { borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, minWidth: 92, padding: 12 }, confirmLogout: { backgroundColor: colors.danger, borderRadius: radii.pill, minWidth: 92, padding: 12 }, confirmLogoutText: { color: colors.white, textAlign: 'center' },
  identity: { alignItems: 'center', gap: 4, paddingVertical: spacing.xl }, avatar: { borderRadius: 48, height: 96, width: 96 }, avatarFallback: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: 48, height: 96, justifyContent: 'center', width: 96 }, initials: { color: colors.primary, fontSize: 30, fontWeight: '800' }, name: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', lineHeight: 31, marginTop: spacing.sm },
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md }, photoButton: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: radii.pill, flexDirection: 'row', gap: 6, minHeight: 42, paddingHorizontal: spacing.md }, photoButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' }, removeButton: { borderColor: '#FECACA', borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: spacing.md }, removeText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  form: { gap: spacing.md }, label: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 6 }, input: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 14, minHeight: 50, paddingHorizontal: spacing.md }, save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.pill, justifyContent: 'center', minHeight: 50 }, saveText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, grow: { flex: 1, minWidth: 0 }, success: { color: colors.success, fontSize: 13, textAlign: 'center' }, error: { color: colors.danger, fontSize: 13, textAlign: 'center' }, logout: { alignItems: 'center', backgroundColor: colors.dangerSurface, borderColor: '#FECACA', borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52 }, logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
})
