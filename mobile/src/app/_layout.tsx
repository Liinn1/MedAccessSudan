import { Stack } from 'expo-router'
import { useFonts } from '@expo-google-fonts/material-symbols/useFonts'
import { MaterialSymbols_400Regular } from '@expo-google-fonts/material-symbols/400Regular'
import { Cairo_400Regular } from '@expo-google-fonts/cairo/400Regular'
import { Cairo_500Medium } from '@expo-google-fonts/cairo/500Medium'
import { Cairo_600SemiBold } from '@expo-google-fonts/cairo/600SemiBold'
import { Cairo_700Bold } from '@expo-google-fonts/cairo/700Bold'
import { Cairo_800ExtraBold } from '@expo-google-fonts/cairo/800ExtraBold'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { I18nManager } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import 'react-native-reanimated'
import { i18nReady } from '@/i18n'
import { colors } from '@/theme/tokens'
import { AuthProvider, useAuth } from '@/providers/auth-provider'

I18nManager.allowRTL(true)
void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false)
  const [fontsLoaded, fontError] = useFonts({
    MaterialSymbols_400Regular,
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  })

  useEffect(() => {
    let active = true
    const fallback = setTimeout(() => {
      if (active) setIsReady(true)
    }, 3000)

    void i18nReady.finally(() => {
      clearTimeout(fallback)
      if (active) setIsReady(true)
    })

    return () => {
      active = false
      clearTimeout(fallback)
    }
  }, [])

  useEffect(() => {
    if (isReady) void SplashScreen.hideAsync()
  }, [isReady])

  if (!isReady || (!fontsLoaded && !fontError)) return null

  return <SafeAreaProvider><AuthProvider><RootNavigator /></AuthProvider></SafeAreaProvider>
}

function RootNavigator() {
  const { status, user } = useAuth()
  return <>
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerTintColor: colors.primary }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={status === 'authenticated' && user?.role === 'patient'}>
        <Stack.Screen name="(patient)" options={{ headerShown: false }} />
        <Stack.Screen name="patient-laboratory-order/[id]" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'authenticated' && user?.role === 'doctor'}>
        <Stack.Screen name="(doctor)" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-appointment/[id]" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'authenticated' && user?.role === 'laboratory'}>
        <Stack.Screen name="(laboratory)" options={{ headerShown: false }} />
        <Stack.Screen name="laboratory-order/[id]" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'unauthenticated'}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="account-type" options={{ headerShown: false }} />
        <Stack.Screen name="register-doctor" options={{ headerShown: false }} />
        <Stack.Screen name="register-laboratory" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
    <StatusBar style="dark" />
  </>
}
