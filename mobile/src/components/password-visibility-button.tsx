import { Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MaterialIcon } from '@/components/material-icon'
import { colors } from '@/theme/tokens'

type PasswordVisibilityButtonProps = {
  disabled?: boolean
  onPress: () => void
  visible: boolean
}

export function PasswordVisibilityButton({ disabled, onPress, visible }: PasswordVisibilityButtonProps) {
  const { t } = useTranslation()
  return <Pressable
    accessibilityLabel={t(visible ? 'auth.login.hidePassword' : 'auth.login.showPassword')}
    accessibilityRole="button"
    disabled={disabled}
    hitSlop={8}
    onPress={onPress}
    style={styles.button}
  >
    <MaterialIcon color={colors.textSecondary} name={visible ? 'visibility_off' : 'visibility'} size={22} />
  </Pressable>
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
})
