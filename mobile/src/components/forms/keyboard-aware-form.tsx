import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type KeyboardAwareFormProps = {
  children: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
  safeAreaStyle?: StyleProp<ViewStyle>
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>
}

type KeyboardAwareScrollViewProps = {
  children: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
} & Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>

export function KeyboardAwareScrollView({ children, contentContainerStyle, ...props }: KeyboardAwareScrollViewProps) {
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
    <ScrollView
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  </KeyboardAvoidingView>
}

export function KeyboardAwareForm({ children, contentContainerStyle, safeAreaStyle, scrollViewProps }: KeyboardAwareFormProps) {
  return <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={[styles.safeArea, safeAreaStyle]}>
    <KeyboardAwareScrollView contentContainerStyle={contentContainerStyle} {...scrollViewProps}>{children}</KeyboardAwareScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
})
