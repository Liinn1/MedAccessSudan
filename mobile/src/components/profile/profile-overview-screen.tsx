import { Image, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { MaterialIcon } from '@/components/material-icon'
import { PatientScreen, patientScreenStyles as shared } from '@/components/patient/patient-screen'
import { useAppLanguage } from '@/hooks/use-app-language'
import { useAuth } from '@/providers/auth-provider'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

export type ProfileMenuItem = { path: string; icon: string; label: string }

export function ProfileOverviewScreen({ title, subtitle, roleLabel, identityPath, account, support }: { title: string; subtitle: string; roleLabel: string; identityPath: string; account: readonly ProfileMenuItem[]; support: readonly ProfileMenuItem[] }) {
  const { t } = useTranslation(); const router = useRouter(); const { user, logout } = useAuth(); const { isRTL, shouldMirrorLayout } = useAppLanguage(); const [logoutOpen, setLogoutOpen] = useState(false)
  const direction = shouldMirrorLayout ? shared.reverse : undefined; const alignment = isRTL ? shared.rtl : shared.ltr
  const rows = (items: readonly ProfileMenuItem[]) => items.map((item, index) => <Pressable accessibilityRole="button" key={item.path} onPress={() => router.push(item.path as never)} style={({ pressed }) => [styles.menuRow, direction, index > 0 && styles.divider, pressed && shared.pressed]}>
    <MaterialIcon color={colors.primary} name={item.icon} size={23} /><Text style={[styles.menuLabel, alignment, isRTL && arabicFonts.semiBold]}>{item.label}</Text><MaterialIcon color={colors.textMuted} name={isRTL ? 'chevron_left' : 'chevron_right'} size={22} />
  </Pressable>)
  return <PatientScreen subtitle={subtitle} title={title}>
    <Pressable accessibilityRole="button" onPress={() => router.push(identityPath as never)} style={({ pressed }) => [shared.card, styles.identityGateway, direction, pressed && shared.pressed]}>
      {user?.profile_image_url ? <Image source={{ uri: user.profile_image_url }} style={styles.gatewayAvatar} /> : <View style={styles.gatewayFallback}><Text style={styles.gatewayInitials}>{initials(user?.name)}</Text></View>}
      <View style={styles.grow}><Text style={[styles.gatewayName, alignment, isRTL && arabicFonts.extraBold]}>{user?.name}</Text><Text style={[shared.body, alignment, isRTL && arabicFonts.regular]}>{roleLabel}</Text><Text numberOfLines={1} style={[shared.meta, alignment, isRTL && arabicFonts.regular]}>{user?.email}</Text></View>
      <MaterialIcon color={colors.textMuted} name={isRTL ? 'chevron_left' : 'chevron_right'} size={24} />
    </Pressable>
    <View><Text style={[styles.sectionLabel, alignment]}>{t('patient.settings.account')}</Text><View style={styles.menu}>{rows(account)}</View></View>
    <View><Text style={[styles.sectionLabel, alignment]}>{t('patient.settings.support')}</Text><View style={styles.menu}>{rows(support)}</View></View>
    <Pressable accessibilityRole="button" onPress={() => setLogoutOpen(true)} style={({ pressed }) => [styles.logout, direction, pressed && shared.pressed]}><MaterialIcon color={colors.danger} name="logout" size={22} /><Text style={[styles.logoutText, isRTL && arabicFonts.bold]}>{t('home.logout')}</Text></Pressable>
    <Modal animationType="fade" onRequestClose={() => setLogoutOpen(false)} transparent visible={logoutOpen}><View style={styles.overlay}><View accessibilityViewIsModal style={styles.dialog}><Text style={[styles.dialogTitle, alignment]}>{t('patient.settings.logoutTitle')}</Text><Text style={[shared.body, alignment]}>{t('patient.settings.logoutDescription')}</Text><View style={[styles.dialogActions, direction]}><Pressable accessibilityRole="button" onPress={() => setLogoutOpen(false)} style={styles.cancel}><Text>{t('patient.settings.cancel')}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.confirmLogout}><Text style={styles.confirmLogoutText}>{t('home.logout')}</Text></Pressable></View></View></View></Modal>
  </PatientScreen>
}
function initials(name?: string) { return (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'M' }
const styles = StyleSheet.create({ identityGateway: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, gatewayAvatar: { borderRadius: 34, height: 68, width: 68 }, gatewayFallback: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: 34, height: 68, justifyContent: 'center', width: 68 }, gatewayInitials: { color: colors.primary, fontSize: 22, fontWeight: '800' }, gatewayName: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' }, sectionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: .7, marginBottom: 8, paddingHorizontal: 4, textTransform: 'uppercase' }, menu: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' }, menuRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 58, paddingHorizontal: spacing.md }, menuLabel: { color: colors.textPrimary, flex: 1, fontSize: 14, fontWeight: '600' }, divider: { borderTopColor: colors.border, borderTopWidth: 1 }, grow: { flex: 1, minWidth: 0 }, logout: { alignItems: 'center', backgroundColor: colors.dangerSurface, borderColor: '#FECACA', borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52 }, logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' }, overlay: { alignItems: 'center', backgroundColor: '#0F172A66', flex: 1, justifyContent: 'center', padding: spacing.lg }, dialog: { backgroundColor: colors.white, borderRadius: radii.lg, gap: spacing.sm, maxWidth: 380, padding: spacing.lg, width: '100%' }, dialogTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' }, dialogActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.sm }, cancel: { borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, minWidth: 92, padding: 12 }, confirmLogout: { backgroundColor: colors.danger, borderRadius: radii.pill, minWidth: 92, padding: 12 }, confirmLogoutText: { color: colors.white, textAlign: 'center' } })
