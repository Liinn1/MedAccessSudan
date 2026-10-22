import { Stack } from 'expo-router'

export const unstable_settings = {
  initialRouteName: 'index',
}

export default function PatientProfileLayout() {
  return <Stack initialRouteName="index" screenOptions={{ headerShown: false }} />
}
