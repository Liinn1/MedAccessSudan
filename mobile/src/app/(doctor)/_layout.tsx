import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Tabs, useFocusEffect } from 'expo-router'
import { DoctorTabBar } from '@/components/doctor/doctor-tab-bar'
import { RolePendingScreen } from '@/screens/role-pending-screen'
import { getProviderVerification, type ProviderVerificationStatus } from '@/services/provider-verification-service'
import { colors } from '@/theme/tokens'

export default function DoctorLayout(){const[status,setStatus]=useState<ProviderVerificationStatus|null>(null);const[loading,setLoading]=useState(true);useFocusEffect(useCallback(()=>{let active=true;setLoading(true);void getProviderVerification('doctor').then(v=>{if(active)setStatus(v.status)}).catch(()=>{if(active)setStatus(null)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]));if(loading)return <View style={styles.loading}><ActivityIndicator color={colors.primary}/></View>;if(status!=='verified')return <RolePendingScreen onStatusChange={setStatus}/>;return <Tabs screenOptions={{headerShown:false}} tabBar={p=><DoctorTabBar state={p.state} onNavigate={name=>p.navigation.navigate(name)}/>}><Tabs.Screen name="index" options={{href:null}}/><Tabs.Screen name="home"/><Tabs.Screen name="appointments"/><Tabs.Screen name="availability"/><Tabs.Screen name="profile"/></Tabs>}
const styles=StyleSheet.create({loading:{alignItems:'center',backgroundColor:colors.background,flex:1,justifyContent:'center'}})
