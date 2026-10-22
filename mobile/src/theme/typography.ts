import { StyleSheet } from 'react-native'

export const cairoFontFamilies = {
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semiBold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  extraBold: 'Cairo_800ExtraBold',
} as const

export const cairoFonts = StyleSheet.create({
  regular: { fontFamily: cairoFontFamilies.regular },
  medium: { fontFamily: cairoFontFamilies.medium },
  semiBold: { fontFamily: cairoFontFamilies.semiBold },
  bold: { fontFamily: cairoFontFamilies.bold },
  extraBold: { fontFamily: cairoFontFamilies.extraBold },
})

// Retained while existing screens migrate to the language-neutral name.
export const arabicFonts = cairoFonts
