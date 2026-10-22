import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/client'
import { AppText as Text } from '@/components/app-text'
import { MaterialIcon } from '@/components/material-icon'
import { useAppLanguage } from '@/hooks/use-app-language'
import { useAuth } from '@/providers/auth-provider'
import type { MobileImageFile } from '@/services/auth-service'
import {
  getProviderVerification,
  submitProviderVerification,
  uploadProviderVerificationDocument,
  type ProviderVerification,
  type VerificationRequirement,
} from '@/services/provider-verification-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

export function RolePendingScreen({ onStatusChange }: { onStatusChange?: (status: ProviderVerification['status']) => void } = {}) {
  const { t } = useTranslation(); const { isRTL } = useAppLanguage(); const { logout, user } = useAuth()
  const direction = isRTL ? styles.rtl : styles.ltr
  const role = user?.role === 'laboratory' ? 'laboratory' : 'doctor'
  const [verification, setVerification] = useState<ProviderVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyType, setBusyType] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try { const result = await getProviderVerification(role); setVerification(result); onStatusChange?.(result.status) }
    catch { setError(t('auth.rolePending.errors.load')) }
    finally { setLoading(false) }
  }, [onStatusChange, role, t])

  useFocusEffect(useCallback(() => { setLoading(true); void load() }, [load]))

  async function chooseDocument(requirement: VerificationRequirement) {
    if (busyType || !verification?.can_upload) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) { setError(t('auth.rolePending.errors.permission')); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .9 })
    if (result.canceled) return
    const asset = result.assets[0]
    const file: MobileImageFile = {
      uri: asset.uri,
      name: asset.fileName || `${requirement.document_type}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    }
    setBusyType(requirement.document_type); setError('')
    try { setVerification(await uploadProviderVerificationDocument(role, requirement.document_type, file)) }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 422) setError(t('auth.rolePending.errors.document'))
      else if (cause instanceof ApiError && cause.status === 413) setError(t('auth.rolePending.errors.tooLarge'))
      else if (cause instanceof ApiError && cause.status === 401) setError(t('auth.rolePending.errors.session'))
      else if (cause instanceof ApiError && cause.status === 403) setError(t('auth.rolePending.errors.forbidden'))
      else if (cause instanceof ApiError && cause.status && cause.status >= 500) setError(t('auth.rolePending.errors.server'))
      else if (cause instanceof ApiError && cause.code === 'network') setError(t('auth.rolePending.errors.network'))
      else if (cause instanceof ApiError && cause.code === 'request') setError(t('auth.rolePending.errors.document'))
      else setError(t('auth.rolePending.errors.upload'))
    } finally { setBusyType(null) }
  }

  async function submit() {
    if (!verification?.can_submit || busyType) return
    setBusyType('submit'); setError('')
    try { setVerification(await submitProviderVerification(role)) }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 422) setError(t('auth.rolePending.errors.incomplete'))
      else setError(t('auth.rolePending.errors.submit'))
    } finally { setBusyType(null) }
  }

  const status = verification?.status
  const locked = status === 'under_review' || status === 'verified' || status === 'suspended'
  return <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.icon}><MaterialIcon color={colors.primary} name={status === 'verified' ? 'verified' : role === 'doctor' ? 'medical_services' : 'science'} size={46} /></View>
    <Text style={[styles.title, direction, isRTL && arabicFonts.extraBold]}>{t(`auth.rolePending.status.${status ?? 'loading'}.title`)}</Text>
    <Text style={[styles.description, direction, isRTL && arabicFonts.regular]}>{t(`auth.rolePending.status.${status ?? 'loading'}.description`)}</Text>

    {!loading && verification && !locked && <View style={styles.documents}>
      <Text style={[styles.sectionTitle, direction, isRTL && arabicFonts.bold]}>{t('auth.rolePending.documentsTitle')}</Text>
      {verification.requirements.map((requirement) => {
        const current = requirement.current
        const replaceable = !current || current.status === 'rejected'
        return <View key={requirement.document_type} style={styles.documentCard}>
          <View style={styles.documentText}>
            <Text style={[styles.documentTitle, direction, isRTL && arabicFonts.bold]}>{t(`auth.rolePending.documents.${requirement.document_type}`)}</Text>
            <Text style={[styles.documentStatus, direction, isRTL && arabicFonts.regular]}>{t(`auth.rolePending.documentStatus.${current?.status ?? 'missing'}`)}</Text>
            {!!current?.admin_note && <Text style={[styles.adminNote, direction, isRTL && arabicFonts.regular]}>{current.admin_note}</Text>}
          </View>
          <Pressable accessibilityRole="button" disabled={!replaceable || Boolean(busyType)} onPress={() => void chooseDocument(requirement)} style={({ pressed }) => [styles.uploadButton, (!replaceable || busyType) && styles.disabled, pressed && styles.pressed]}>
            <MaterialIcon color={colors.primary} name={current ? 'upload_file' : 'add_photo_alternate'} size={22} />
            <Text style={[styles.uploadText, isRTL && arabicFonts.bold]}>{t(busyType === requirement.document_type ? 'auth.rolePending.uploading' : current ? 'auth.rolePending.replace' : 'auth.rolePending.upload')}</Text>
          </Pressable>
        </View>
      })}
      <Pressable accessibilityRole="button" disabled={!verification.can_submit || Boolean(busyType)} onPress={() => void submit()} style={({ pressed }) => [styles.button, (!verification.can_submit || busyType) && styles.disabled, pressed && styles.pressed]}><Text style={[styles.buttonText, isRTL && arabicFonts.bold]}>{t(busyType === 'submit' ? 'auth.rolePending.submitting' : 'auth.rolePending.submit')}</Text></Pressable>
    </View>}

    {!!error && <Text accessibilityLiveRegion="polite" style={[styles.error, direction, isRTL && arabicFonts.regular]}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={loading || Boolean(busyType)} onPress={() => { setLoading(true); void load() }} style={styles.secondaryButton}><Text style={[styles.secondaryButtonText, isRTL && arabicFonts.bold]}>{t('common.retry')}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.logoutButton}><Text style={[styles.logoutText, isRTL && arabicFonts.bold]}>{t('home.logout')}</Text></Pressable>
  </ScrollView></SafeAreaView>
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.primarySurface, flex: 1 }, content: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  icon: { alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.pill, height: 92, justifyContent: 'center', width: 92 },
  title: { color: colors.textPrimary, fontSize: 27, fontWeight: '800', lineHeight: 38, marginTop: spacing.lg, textAlign: 'center' },
  description: { color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginTop: spacing.sm, maxWidth: 360, textAlign: 'center' },
  documents: { gap: spacing.sm, marginTop: spacing.lg, width: '100%' }, sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  documentCard: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  documentText: { flex: 1 }, documentTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' }, documentStatus: { color: colors.textSecondary, fontSize: 12, marginTop: 3 }, adminNote: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 5 },
  uploadButton: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: radii.sm, gap: 3, minWidth: 82, padding: spacing.sm }, uploadText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, justifyContent: 'center', marginTop: spacing.sm, minHeight: 52, width: '100%' },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' }, secondaryButton: { alignItems: 'center', borderColor: colors.primary, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center', marginTop: spacing.lg, minHeight: 48, width: '100%' }, secondaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  logoutButton: { marginTop: spacing.md, padding: spacing.sm }, logoutText: { color: colors.textSecondary, fontSize: 14 }, error: { color: colors.danger, fontSize: 13, lineHeight: 20, marginTop: spacing.md, width: '100%' },
  disabled: { opacity: .45 }, pressed: { opacity: .72 }, ltr: { textAlign: 'left', writingDirection: 'ltr' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
})
