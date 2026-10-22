import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { MaterialIcon } from '@/components/material-icon'
import { SettingsScreen } from '@/components/patient/settings-screen'
import { patientScreenStyles as shared } from '@/components/patient/patient-screen'
import { useAppLanguage } from '@/hooks/use-app-language'
import { getProviderVerification, type ProviderVerification } from '@/services/provider-verification-service'
import { colors, radii, spacing } from '@/theme/tokens'

export function LaboratoryVerificationScreen() {
  const { t } = useTranslation()
  const { isRTL, shouldMirrorLayout } = useAppLanguage()
  const [verification, setVerification] = useState<ProviderVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const alignment = isRTL ? shared.rtl : shared.ltr
  const direction = shouldMirrorLayout ? shared.reverse : undefined

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setVerification(await getProviderVerification('laboratory')) }
    catch { setError(t('auth.rolePending.errors.load')) }
    finally { setLoading(false) }
  }, [t])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  return <SettingsScreen title={t('laboratory.profile.verification')} description={t('laboratory.profile.verificationDescription')}>
    {loading ? <ActivityIndicator color={colors.primary} /> : verification && <>
      <View style={styles.summary}>
        <View style={styles.icon}><MaterialIcon color={colors.primary} name={verification.status === 'verified' ? 'verified' : 'fact_check'} size={38} /></View>
        <Text style={[styles.title, alignment]}>{t(`auth.rolePending.status.${verification.status}.title`)}</Text>
        <Text style={[styles.description, alignment]}>{t(`auth.rolePending.status.${verification.status}.description`)}</Text>
        {!!verification.admin_note && <Text style={[styles.note, alignment]}>{verification.admin_note}</Text>}
      </View>
      <View style={styles.documents}>
        <Text style={[styles.sectionTitle, alignment]}>{t('auth.rolePending.documentsTitle')}</Text>
        {verification.requirements.map((requirement) => <View key={requirement.document_type} style={[styles.document, direction]}>
          <MaterialIcon color={requirement.current?.status === 'approved' ? colors.success : colors.primary} name="description" size={23} />
          <View style={styles.grow}>
            <Text style={[styles.documentTitle, alignment]}>{t(`auth.rolePending.documents.${requirement.document_type}`)}</Text>
            <Text style={[styles.documentStatus, alignment]}>{t(`auth.rolePending.documentStatus.${requirement.current?.status ?? 'missing'}`)}</Text>
            {!!requirement.current?.original_filename && <Text numberOfLines={1} style={[styles.filename, alignment]}>{requirement.current.original_filename}</Text>}
          </View>
        </View>)}
      </View>
    </>}
    {!!error && <Text accessibilityLiveRegion="polite" style={[styles.error, alignment]}>{error}</Text>}
  </SettingsScreen>
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  icon: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: 34, height: 68, justifyContent: 'center', width: 68 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  note: { backgroundColor: colors.dangerSurface, borderRadius: radii.md, color: colors.danger, fontSize: 13, lineHeight: 20, padding: spacing.sm, width: '100%' },
  documents: { gap: spacing.sm }, sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  document: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  grow: { flex: 1, minWidth: 0 }, documentTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  documentStatus: { color: colors.textSecondary, fontSize: 12, marginTop: 3 }, filename: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
})
