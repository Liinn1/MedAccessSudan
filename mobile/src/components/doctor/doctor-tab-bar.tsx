import { MobileTabBar } from '@/components/navigation/mobile-tab-bar'

const tabs = [
  { name: 'home', icon: 'dashboard', label: 'home' },
  { name: 'appointments', icon: 'calendar_month', label: 'appointments' },
  { name: 'availability', icon: 'schedule', label: 'availability' },
  { name: 'profile', icon: 'person', label: 'profile' },
] as const

export function DoctorTabBar({ state, onNavigate }: { state: { index: number; routes: { key: string; name: string }[] }; onNavigate: (name: string) => void }) {
  return <MobileTabBar onNavigate={onNavigate} state={state} tabs={tabs.map((tab) => ({ ...tab, labelKey: `doctor.navigation.${tab.label}` }))} />
}
