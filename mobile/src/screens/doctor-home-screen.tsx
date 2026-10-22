import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { KeyboardAwareScrollView } from '@/components/forms/keyboard-aware-form'
import { MobileFeatureBanner, MobileHomeGreeting, MobileHomeHeader, MobileQuickGrid, MobileSectionHeader, MobileTipCard, mobileHomeStyles as shared } from '@/components/home/mobile-home-ui'
import { MaterialIcon } from '@/components/material-icon'
import { useAppLanguage } from '@/hooks/use-app-language'
import { useAuth } from '@/providers/auth-provider'
import { getDoctorDashboard, type DoctorDashboard } from '@/services/doctor-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'
import { formatMedAccessDateTime } from '@/utils/date-time'

const cards = [
  { key: 'appointments', icon: 'calendar_month', color: '#0D9488', surface: '#E6FAF7' },
  { key: 'availability', icon: 'schedule', color: '#0284C7', surface: '#E8F5FD' },
  { key: 'clinic', icon: 'stethoscope', color: '#EA7A2D', surface: '#FFF2E8' },
  { key: 'home_visit', icon: 'home_health', color: '#7C3AED', surface: '#F2ECFF' },
] as const

const tips = [
  { key: 'availability', image: require('../../assets/images/doctor-tips/manage-availability.jpg'), route: '/(doctor)/availability' },
  { key: 'profile', image: require('../../assets/images/doctor-tips/update-profile.jpg'), route: '/(doctor)/profile' },
  { key: 'appointments', image: require('../../assets/images/doctor-tips/plan-appointments.jpg'), route: '/(doctor)/appointments' },
] as const

export function DoctorHomeScreen() {
  const { t } = useTranslation(); const router = useRouter(); const { user, logout } = useAuth(); const { language, isRTL, shouldMirrorLayout } = useAppLanguage(); const [data, setData] = useState<DoctorDashboard | null>(null); const [state, setState] = useState<'loading'|'success'|'error'>('loading'); const [refreshing, setRefreshing] = useState(false)
  const load = useCallback(async (refresh=false) => { if(refresh)setRefreshing(true);else setState('loading');try{setData(await getDoctorDashboard());setState('success')}catch{setState('error')}finally{setRefreshing(false)}},[]); useFocusEffect(useCallback(()=>{void load()},[load]))
  const greeting = useMemo(()=>{const hour=new Date().getHours();return t(`home.greetings.${hour<12?'morning':hour<18?'afternoon':'evening'}`)},[t]); const reverse=shouldMirrorLayout?shared.rowReverse:undefined; const text=isRTL?shared.rtlText:shared.ltrText; const upcoming=data?.insights?.upcoming_appointments?.[0]; const totals=data?.insights?.appointment_overview.totals; const formatAppointment=(value:string)=>formatMedAccessDateTime(value,language,{dateStyle:'medium',timeStyle:'short'})
  function navigate(key: typeof cards[number]['key']) { if(key==='availability')router.navigate('/(doctor)/availability');else router.navigate('/(doctor)/appointments') }
  return <SafeAreaView edges={['top','right','left']} style={styles.safeArea}><StatusBar style="dark"/><KeyboardAwareScrollView contentContainerStyle={shared.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void load(true)} tintColor={colors.primary}/>} showsVerticalScrollIndicator={false}>
    <MobileHomeHeader onLogout={()=>void logout()}/><MobileHomeGreeting greeting={greeting} icon="medical_services" name={user?.first_name||user?.name||''} prompt={t('doctor.home.subtitle')}/>
    <MobileQuickGrid>{cards.map(card=><Pressable accessibilityRole="button" key={card.key} onPress={()=>navigate(card.key)} style={({pressed})=>[shared.quickCard,{backgroundColor:card.surface},pressed&&shared.pressed]}><MaterialIcon color={card.color} name={card.icon} size={36}/><Text numberOfLines={2} style={[shared.quickLabel,isRTL&&arabicFonts.bold]}>{t(`doctor.home.quick.${card.key}`)}</Text></Pressable>)}</MobileQuickGrid>
    <MobileFeatureBanner action={t('doctor.home.manageAvailability')} description={t('doctor.home.bannerDescription')} icon="schedule" onPress={()=>router.navigate('/(doctor)/availability')} title={t('doctor.home.bannerTitle')}/>
    <MobileSectionHeader title={t('doctor.home.overview')}/><View style={[styles.stats,reverse]}>{(['total','upcoming','completed','cancelled'] as const).map(key=><View key={key} style={styles.stat}><Text style={styles.statValue}>{totals?.[key]??0}</Text><Text style={styles.statLabel}>{t(`doctor.home.stats.${key}`)}</Text></View>)}</View>
    <MobileSectionHeader action={t('home.viewAll')} onAction={()=>router.navigate('/(doctor)/appointments')} title={t('doctor.home.upcoming')}/>
    {state==='loading'?<View style={styles.state}><ActivityIndicator color={colors.primary}/></View>:state==='error'?<View style={styles.state}><MaterialIcon color={colors.danger} name="cloud_off" size={30}/><Text style={styles.stateText}>{t('doctor.common.loadError')}</Text><Pressable onPress={()=>void load()} style={styles.retry}><Text style={styles.retryText}>{t('common.retry')}</Text></Pressable></View>:upcoming?<Pressable onPress={()=>router.push({pathname:'/doctor-appointment/[id]',params:{id:String(upcoming.id)}})} style={({pressed})=>[shared.appointment,reverse,pressed&&shared.pressed]}><View style={shared.appointmentIcon}><MaterialIcon color={colors.primary} name={upcoming.service_type==='home_visit'?'home_health':'event_available'} size={30}/></View><View style={shared.grow}><Text style={[shared.cardTitle,text]}>{upcoming.patient_name||t('doctor.appointments.patient')}</Text><Text style={[shared.cardDescription,text]}>{t(`doctor.appointments.types.${upcoming.service_type}`)}</Text><Text style={[shared.appointmentTime,text]}>{formatAppointment(upcoming.starts_at)}</Text></View></Pressable>:<View style={[shared.appointment,reverse]}><View style={shared.appointmentIcon}><MaterialIcon color={colors.primary} name="event_busy" size={30}/></View><View style={shared.grow}><Text style={[shared.cardTitle,text]}>{t('doctor.appointments.empty')}</Text><Text style={[shared.cardDescription,text]}>{t('doctor.home.emptyDescription')}</Text></View></View>}
    <MobileSectionHeader title={t('doctor.home.tips.title')}/>
    <FlatList contentContainerStyle={styles.horizontalContent} data={tips} horizontal inverted={shouldMirrorLayout}
      keyExtractor={(tip)=>tip.key} renderItem={({item:tip})=><MobileTipCard action={t(`doctor.home.tips.slides.${tip.key}.cta`)}
        description={t(`doctor.home.tips.slides.${tip.key}.description`)} image={tip.image}
        label={t(`doctor.home.tips.slides.${tip.key}.label`)} onPress={()=>router.navigate(tip.route)}
        title={t(`doctor.home.tips.slides.${tip.key}.title`)}/>} showsHorizontalScrollIndicator={false}
      style={styles.horizontalScroll}/>
  </KeyboardAwareScrollView></SafeAreaView>
}
const styles=StyleSheet.create({safeArea:{backgroundColor:colors.background,flex:1},stats:{flexDirection:'row',gap:8},stat:{alignItems:'center',backgroundColor:colors.white,borderColor:colors.border,borderRadius:radii.lg,borderWidth:1,flex:1,minHeight:82,justifyContent:'center',padding:6},statValue:{color:colors.textPrimary,fontSize:21,fontWeight:'800'},statLabel:{color:colors.textSecondary,fontSize:9,lineHeight:14,textAlign:'center'},state:{alignItems:'center',backgroundColor:colors.white,borderColor:colors.border,borderRadius:radii.lg,borderWidth:1,gap:spacing.sm,justifyContent:'center',minHeight:122,padding:spacing.lg},stateText:{color:colors.textSecondary,fontSize:14,textAlign:'center'},retry:{backgroundColor:colors.primarySurface,borderRadius:radii.pill,paddingHorizontal:spacing.md,paddingVertical:spacing.sm},retryText:{color:colors.primary,fontWeight:'700'},horizontalScroll:{marginHorizontal:-spacing.md},horizontalContent:{gap:12,paddingHorizontal:spacing.md}})
