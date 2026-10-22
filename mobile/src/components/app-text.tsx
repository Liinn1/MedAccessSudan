import { forwardRef } from 'react'
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native'
import { cairoFontFamilies } from '@/theme/typography'

function cairoFamily(style: TextProps['style'] | TextInputProps['style']) {
  const weight = String(StyleSheet.flatten(style)?.fontWeight ?? '400')
  if (weight === '800' || weight === '900') return cairoFontFamilies.extraBold
  if (weight === '700' || weight === 'bold') return cairoFontFamilies.bold
  if (weight === '600') return cairoFontFamilies.semiBold
  if (weight === '500') return cairoFontFamilies.medium
  return cairoFontFamilies.regular
}

export function AppText({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[style, { fontFamily: cairoFamily(style), fontWeight: 'normal' }]} />
}

export const AppTextInput = forwardRef<NativeTextInput, TextInputProps>(function AppTextInput({ style, ...props }, ref) {
  return <NativeTextInput ref={ref} {...props} style={[style, { fontFamily: cairoFamily(style), fontWeight: 'normal' }]} />
})
