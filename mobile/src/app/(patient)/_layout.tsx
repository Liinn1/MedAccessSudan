import { Tabs, usePathname } from 'expo-router'
import { PatientTabBar } from '@/components/patient/patient-tab-bar'
import { PatientRatingPrompt } from '@/components/patient/patient-rating-prompt'

export default function PatientTabsLayout() {
  const pathname = usePathname()
  return <><Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <PatientTabBar state={props.state} onNavigate={(name) => props.navigation.navigate(name)} />}>
    <Tabs.Screen name="home" />
    <Tabs.Screen name="find-care" />
    <Tabs.Screen name="appointments" />
    <Tabs.Screen name="lab-tests" />
    <Tabs.Screen name="profile" />
  </Tabs><PatientRatingPrompt refreshKey={pathname} /></>
}
