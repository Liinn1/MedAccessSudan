import { MobileTabBar } from '@/components/navigation/mobile-tab-bar'
const tabs=[{name:'home',icon:'dashboard',labelKey:'laboratory.navigation.home'},{name:'requests',icon:'assignment',labelKey:'laboratory.navigation.requests'},{name:'tests',icon:'science',labelKey:'laboratory.navigation.tests'},{name:'profile',icon:'business',labelKey:'laboratory.navigation.profile'}] as const
export function LaboratoryTabBar({state,onNavigate}:{state:{index:number;routes:{key:string;name:string}[]};onNavigate:(name:string)=>void}){return <MobileTabBar onNavigate={onNavigate} state={state} tabs={tabs}/>}
