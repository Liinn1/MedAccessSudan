import { useCallback, useState } from 'react'
import { Image, Pressable, StyleSheet, Switch, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text'
import { MaterialIcon } from '@/components/material-icon'
import { patientScreenStyles as shared } from '@/components/patient/patient-screen'
import { SettingsScreen } from '@/components/patient/settings-screen'
import { ProfileOverviewScreen } from '@/components/profile/profile-overview-screen'
import { useAppLanguage } from '@/hooks/use-app-language'
import { useAuth } from '@/providers/auth-provider'
import { getRegistrationOptions, type RegistrationOption } from '@/services/auth-service'
import { SearchableOptionSelector } from '@/components/forms/searchable-option-selector'
import { getDoctorDashboard, updateDoctorProfile, updateDoctorProfilePhoto, type DoctorDashboard } from '@/services/doctor-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

export function DoctorProfileScreen() {
  const { t } = useTranslation()
  useSyncDoctorProfileImage()
  const account = [
    { path: '/(doctor)/profile/personal-information', icon: 'person', label: t('patient.settings.menu.personalInformation') }, { path: '/(doctor)/profile/professional-information', icon: 'medical_services', label: t('doctor.profile.professional') }, { path: '/(doctor)/profile/security', icon: 'lock', label: t('patient.settings.menu.security') }, { path: '/(doctor)/profile/notifications', icon: 'notifications', label: t('patient.settings.menu.notifications') }, { path: '/(doctor)/profile/language-settings', icon: 'language', label: t('patient.settings.menu.language') },
  ] as const
  const support = [
    { path: '/(doctor)/profile/faq', icon: 'help', label: t('patient.settings.menu.faq') }, { path: '/(doctor)/profile/help-support', icon: 'support_agent', label: t('patient.settings.menu.help') }, { path: '/(doctor)/profile/about-medaccess', icon: 'info', label: t('patient.settings.menu.about') }, { path: '/(doctor)/profile/privacy-security', icon: 'privacy_tip', label: t('patient.settings.menu.privacy') },
  ] as const
  return <ProfileOverviewScreen account={account} identityPath="/(doctor)/profile/personal-information" roleLabel={t('doctor.profile.role')} subtitle={t('patient.settings.subtitle')} support={support} title={t('doctor.profile.title')} />
}

export function DoctorPersonalInformationScreen() {
  const { t } = useTranslation(); const { user, updateCurrentUser } = useAuth(); const { isRTL, shouldMirrorLayout } = useAppLanguage(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('')
  const direction = shouldMirrorLayout ? shared.reverse : undefined; const alignment = isRTL ? shared.rtl : shared.ltr
  useSyncDoctorProfileImage()
  async function choosePhoto() { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) { setError(t('doctor.profile.photoPermission')); return } const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .8 }); if (result.canceled) return; setBusy(true); setError(''); try { const updated = await updateDoctorProfilePhoto(result.assets[0].uri); if (user) updateCurrentUser({ ...user, profile_image_url: updated.profile_image_url }); setMessage(t('doctor.profile.photoUpdated')) } catch { setError(t('doctor.profile.photoError')) } finally { setBusy(false) } }
  return <SettingsScreen description={t('doctor.profile.personalDescription')} title={t('patient.settings.menu.personalInformation')}>
    <View style={[shared.card, styles.identity]}>{user?.profile_image_url ? <Image source={{ uri: user.profile_image_url }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.initials}>{initials(user?.name)}</Text></View>}<Text style={[styles.name, isRTL && arabicFonts.extraBold]}>{user?.name}</Text><Text style={[shared.body, isRTL && arabicFonts.regular]}>{t('doctor.profile.role')}</Text><View style={[styles.photoActions, direction]}><Pressable accessibilityRole="button" disabled={busy} onPress={() => void choosePhoto()} style={({ pressed }) => [styles.photoButton, pressed && shared.pressed]}><MaterialIcon color={colors.primary} name="photo_camera" size={20} /><Text style={styles.photoButtonText}>{t(busy ? 'patient.profile.uploading' : 'patient.profile.changePhoto')}</Text></Pressable></View></View>
    <View style={[shared.card, styles.form]}><ReadOnlyField alignment={alignment} label={t('patient.profile.firstName')} value={user?.first_name || ''} /><ReadOnlyField alignment={alignment} label={t('patient.profile.lastName')} value={user?.last_name || ''} /><ReadOnlyField alignment={alignment} label={t('patient.profile.email')} value={user?.email || ''} /><ReadOnlyField alignment={alignment} label={t('patient.profile.phone')} value={user?.phone || t('doctor.common.notProvided')} /><Text style={[shared.meta, alignment]}>{t('doctor.profile.personalReadOnly')}</Text></View>
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text>}{!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
  </SettingsScreen>
}

function useSyncDoctorProfileImage() {
  const { user, updateCurrentUser } = useAuth()
  useFocusEffect(useCallback(() => {
    let active = true
    void getDoctorDashboard().then((dashboard) => {
      if (!active || !user) return
      const profileImageUrl = dashboard.profile?.profile_image_url ?? null
      if (profileImageUrl !== user.profile_image_url) updateCurrentUser({ ...user, profile_image_url: profileImageUrl })
    }).catch(() => undefined)
    return () => { active = false }
  }, [updateCurrentUser, user]))
}

export function DoctorProfessionalInformationScreen() {
  const { t } = useTranslation(); const { isRTL, shouldMirrorLayout, language } = useAppLanguage(); const [data, setData] = useState<DoctorDashboard | null>(null); const [locations, setLocations] = useState<RegistrationOption[]>([]); const [location, setLocation] = useState(''); const [address, setAddress] = useState(''); const [clinic, setClinic] = useState(''); const [bio, setBio] = useState(''); const [clinicVisits, setClinicVisits] = useState(false); const [homeVisits, setHomeVisits] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const alignment = isRTL ? shared.rtl : shared.ltr; const direction = shouldMirrorLayout ? shared.reverse : undefined
  const load = useCallback(async () => { try { const [result, options] = await Promise.all([getDoctorDashboard(), getRegistrationOptions()]); setData(result); setLocations(options.locations); setLocation(result.profile?.location?.code || ''); setAddress(result.profile?.address || ''); setClinic(result.profile?.clinic_name || ''); setBio(result.profile?.biography || ''); setClinicVisits(Boolean(result.profile?.offers_clinic_visits)); setHomeVisits(Boolean(result.profile?.offers_home_visits)) } catch { setError(t('doctor.common.loadError')) } }, [t]); useFocusEffect(useCallback(() => { void load() }, [load]))
  async function save() { if (!location || !address.trim()) { setError(t('auth.provider.errors.address')); return } if (!clinicVisits && !homeVisits) { setError(t('doctor.profile.serviceRequired')); return } setBusy(true); setError(''); setMessage(''); try { await updateDoctorProfile({ clinic_name: clinic.trim() || null, biography: bio.trim() || null, biography_language: language === 'ar' ? 'ar' : 'en', location, address: address.trim(), offers_clinic_visits: clinicVisits, offers_home_visits: homeVisits }); await load(); setMessage(t('doctor.profile.saved')) } catch { setError(t('doctor.profile.saveError')) } finally { setBusy(false) } }
  return <SettingsScreen description={t('doctor.profile.professionalDescription')} title={t('doctor.profile.professional')}><View style={[shared.card, styles.form]}><ReadOnlyField alignment={alignment} label={t('doctor.profile.specialization')} value={language === 'ar' ? data?.profile?.specialization?.name_ar || '' : data?.profile?.specialization?.name_en || ''} /><SearchableOptionSelector label={t('auth.provider.state')} onChange={setLocation} options={locations} placeholder={t('auth.provider.selectState')} searchPlaceholder={t('auth.provider.searchState')} value={location} /><FormField alignment={alignment} label={t('auth.provider.address')} onChangeText={setAddress} value={address} /><FormField alignment={alignment} label={t('doctor.profile.clinic')} onChangeText={setClinic} value={clinic} /><FormField alignment={alignment} label={t('doctor.profile.biography')} multiline onChangeText={setBio} value={bio} /><Toggle direction={direction} label={t('doctor.profile.clinicVisits')} onChange={setClinicVisits} value={clinicVisits} /><Toggle direction={direction} label={t('doctor.profile.homeVisits')} onChange={setHomeVisits} value={homeVisits} /><Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={({ pressed }) => [styles.save, (pressed || busy) && shared.pressed]}><Text style={styles.saveText}>{t(busy ? 'patient.profile.saving' : 'doctor.profile.save')}</Text></Pressable></View>{!!message && <Text style={styles.success}>{message}</Text>}{!!error && <Text style={styles.error}>{error}</Text>}</SettingsScreen>
}
function initials(name?: string) { return (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'D' }
function ReadOnlyField({ label, value, alignment }: { label: string; value: string; alignment: object }) { return <View><Text style={[styles.label, alignment]}>{label}</Text><View style={styles.readOnly}><Text style={[styles.readOnlyText, alignment]}>{value}</Text></View></View> }
function FormField({ label, alignment, multiline, ...props }: { label: string; alignment: object; value: string; onChangeText: (value: string) => void; multiline?: boolean }) { return <View><Text style={[styles.label, alignment]}>{label}</Text><TextInput {...props} multiline={multiline} placeholder={label} placeholderTextColor={colors.textMuted} style={[styles.input, multiline && styles.textarea, alignment]} /></View> }
function Toggle({ label, value, onChange, direction }: { label: string; value: boolean; onChange: (value: boolean) => void; direction?: object }) { return <View style={[styles.toggle, direction]}><Text style={styles.toggleLabel}>{label}</Text><Switch onValueChange={onChange} thumbColor={colors.white} trackColor={{ false: colors.disabled, true: colors.primary }} value={value} /></View> }
const styles = StyleSheet.create({ identity: { alignItems: 'center', gap: 4, paddingVertical: spacing.xl }, avatar: { borderRadius: 48, height: 96, width: 96 }, avatarFallback: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: 48, height: 96, justifyContent: 'center', width: 96 }, initials: { color: colors.primary, fontSize: 30, fontWeight: '800' }, name: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', lineHeight: 31, marginTop: spacing.sm }, photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md }, photoButton: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: radii.pill, flexDirection: 'row', gap: 6, minHeight: 42, paddingHorizontal: spacing.md }, photoButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' }, form: { gap: spacing.md }, label: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 6 }, input: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 14, minHeight: 50, paddingHorizontal: spacing.md }, textarea: { minHeight: 112, paddingTop: spacing.md, textAlignVertical: 'top' }, readOnly: { backgroundColor: colors.primarySurface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center', minHeight: 50, paddingHorizontal: spacing.md }, readOnlyText: { color: colors.textSecondary, fontSize: 14 }, toggle: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', minHeight: 58, paddingHorizontal: spacing.md }, toggleLabel: { color: colors.textPrimary, flex: 1, fontSize: 14, fontWeight: '600' }, save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.pill, justifyContent: 'center', minHeight: 50 }, saveText: { color: colors.white, fontSize: 14, fontWeight: '700' }, success: { color: colors.success, fontSize: 13, textAlign: 'center' }, error: { color: colors.danger, fontSize: 13, textAlign: 'center' } })
