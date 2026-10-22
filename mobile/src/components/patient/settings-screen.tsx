import type { PropsWithChildren } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppText as Text } from '@/components/app-text'
import { KeyboardAwareScrollView } from '@/components/forms/keyboard-aware-form'
import { MaterialIcon } from '@/components/material-icon'
import { useAppLanguage } from '@/hooks/use-app-language'
import { colors, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'
import { useAuth } from '@/providers/auth-provider'

export function SettingsScreen({ title, description, children }: PropsWithChildren<{ title: string; description?: string }>) {
  const router = useRouter()
  const { user } = useAuth()
  const { isRTL, shouldMirrorLayout } = useAppLanguage()
  const profileRoute = user?.role === 'doctor' ? '/(doctor)/profile' : user?.role === 'laboratory' ? '/(laboratory)/profile' : '/(patient)/profile'
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
    <View style={[styles.header, shouldMirrorLayout && styles.reverse]}>
      <Pressable accessibilityLabel={isRTL ? 'رجوع' : 'Back'} accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace(profileRoute as never)} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <MaterialIcon color={colors.textPrimary} name={isRTL ? 'arrow_forward' : 'arrow_back'} size={24} />
      </Pressable>
      <View style={styles.heading}><Text style={[styles.title, isRTL && styles.rtl, isRTL && arabicFonts.extraBold]}>{title}</Text>{description && <Text style={[styles.description, isRTL && styles.rtl, isRTL && arabicFonts.regular]}>{description}</Text>}</View>
    </View>
    <KeyboardAwareScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</KeyboardAwareScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, padding: spacing.md }, reverse: { flexDirection: 'row-reverse' },
  back: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 }, pressed: { opacity: .7 }, heading: { flex: 1, minWidth: 0 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', lineHeight: 34 }, description: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, marginTop: 2 }, rtl: { textAlign: 'right', writingDirection: 'rtl' }, content: { gap: spacing.md, paddingBottom: spacing.xl, paddingHorizontal: spacing.md },
})
