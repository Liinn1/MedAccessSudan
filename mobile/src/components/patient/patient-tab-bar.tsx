import { MobileTabBar } from '@/components/navigation/mobile-tab-bar'

const tabs = [
  { name: 'home', icon: 'home', label: 'home' },
  { name: 'find-care', icon: 'medical_services', label: 'findCare' },
  { name: 'appointments', icon: 'calendar_month', label: 'appointments' },
  { name: 'lab-tests', icon: 'science', label: 'labTests' },
  { name: 'profile', icon: 'person', label: 'profile' },
] as const

type PatientTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] }
  onNavigate: (name: string) => void
}

export function PatientTabBar({ state, onNavigate }: PatientTabBarProps) {
  return <MobileTabBar onNavigate={onNavigate} state={state} tabs={tabs.map((tab) => ({ ...tab, labelKey: `patient.navigation.${tab.label}` }))} />
}
