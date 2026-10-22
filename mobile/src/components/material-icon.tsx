import { StyleSheet, Text } from 'react-native'

type MaterialIconProps = {
  color?: string
  name: string
  size?: number
}

export function MaterialIcon({ color = '#111827', name, size = 24 }: MaterialIconProps) {
  return <Text accessibilityElementsHidden style={[styles.icon, { color, fontSize: size, lineHeight: size }]}>{name}</Text>
}

const styles = StyleSheet.create({
  icon: { fontFamily: 'MaterialSymbols_400Regular', fontWeight: 'normal', includeFontPadding: false },
})
