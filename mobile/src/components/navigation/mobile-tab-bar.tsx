import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { MaterialIcon } from '@/components/material-icon'
import { useAppLanguage } from '@/hooks/use-app-language'
import { colors, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

export type MobileTab = { name: string; icon: string; labelKey: string }

export function MobileTabBar({ state, onNavigate, tabs }: { state: { index: number; routes: { key: string; name: string }[] }; onNavigate: (name: string) => void; tabs: readonly MobileTab[] }) {
  const { t } = useTranslation(); const { isRTL, shouldMirrorLayout } = useAppLanguage(); const insets = useSafeAreaInsets()
  return <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }, shouldMirrorLayout && styles.reverse]}>{tabs.map((tab) => {
    const route = state.routes.find((item) => item.name === tab.name); if (!route) return null
    const active = state.routes[state.index]?.name === tab.name
    return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={t(tab.labelKey)} key={tab.name} onPress={() => { if (!active) onNavigate(tab.name) }} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <MaterialIcon color={active ? colors.primary : colors.textMuted} name={tab.icon} size={25} />
      <Text numberOfLines={1} style={[styles.label, active && styles.activeLabel, isRTL && (active ? arabicFonts.bold : arabicFonts.regular)]}>{t(tab.labelKey)}</Text>
      {active && <View style={styles.indicator} />}
    </Pressable>
  })}</View>
}

const styles = StyleSheet.create({
  bar: { alignItems: 'flex-start', backgroundColor: colors.white, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', paddingTop: 9 }, reverse: { flexDirection: 'row-reverse' },
  item: { alignItems: 'center', flex: 1, gap: 2, minHeight: 52, paddingHorizontal: 2, position: 'relative' }, label: { color: colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: 'center' }, activeLabel: { color: colors.primary, fontWeight: '700' }, indicator: { backgroundColor: colors.primary, borderRadius: 999, bottom: -3, height: 3, position: 'absolute', width: 30 }, pressed: { opacity: .65 },
})
