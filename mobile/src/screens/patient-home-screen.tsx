import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { KeyboardAwareScrollView } from '@/components/forms/keyboard-aware-form'
import { MaterialIcon } from '@/components/material-icon'
import { PatientGlobalSearch } from '@/components/patient/patient-global-search'
import { useAppLanguage } from '@/hooks/use-app-language'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'
import { formatMedAccessDateTime } from '@/utils/date-time'
import { useAuth } from '@/providers/auth-provider'
import { getPatientUpcomingBookings, type PatientUpcomingBooking } from '@/services/patient-service'
import { ApiError } from '@/api/client'
import { MobileSectionHeader, MobileTipCard } from '@/components/home/mobile-home-ui'

type AppointmentLoadState = 'loading' | 'success' | 'error'

const quickActions = [
  { key: 'doctor', icon: 'stethoscope', color: '#0D9488', surface: '#E6FAF7' },
  { key: 'laboratory', icon: 'science', color: '#0284C7', surface: '#E8F5FD' },
  { key: 'homeVisit', icon: 'home_health', color: '#EA7A2D', surface: '#FFF2E8' },
  { key: 'appointments', icon: 'calendar_month', color: '#7C3AED', surface: '#F2ECFF' },
] as const

const popularServices = [
  { key: 'generalMedicine', image: require('../../assets/images/patient-home/clinic-visits.jpg') },
  { key: 'laboratory', image: require('../../assets/images/patient-home/laboratory-tests.jpg') },
  { key: 'homeVisit', image: require('../../assets/images/patient-home/home-visits.jpg') },
] as const

const tips = [
  { key: 'hydration', image: require('../../assets/images/patient-home/laboratory-tests.jpg') },
  { key: 'movement', image: require('../../assets/images/patient-home/home-visits.jpg') },
  { key: 'checkups', image: require('../../assets/images/patient-home/clinic-visits.jpg') },
] as const

export function PatientHomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { language, isRTL, shouldMirrorLayout } = useAppLanguage()
  const { logout, user } = useAuth()
  const [upcomingBookings, setUpcomingBookings] = useState<PatientUpcomingBooking[]>([])
  const [appointmentState, setAppointmentState] = useState<AppointmentLoadState>('loading')
  const rowDirection = shouldMirrorLayout ? styles.rowReverse : undefined
  const textDirection = isRTL ? styles.rtlText : styles.ltrText
  const greetingKey = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }, [])
  const nextAppointment = upcomingBookings[0]

  const loadAppointments = useCallback(async () => {
    try {
      setUpcomingBookings(await getPatientUpcomingBookings())
      setAppointmentState('success')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout()
        return
      }
      setAppointmentState('error')
    }
  }, [logout])

  useEffect(() => {
    let active = true
    void getPatientUpcomingBookings().then((records) => {
      if (!active) return
      setUpcomingBookings(records)
      setAppointmentState('success')
    }).catch((error: unknown) => {
      if (!active) return
      if (error instanceof ApiError && error.status === 401) {
        void logout()
        return
      }
      setAppointmentState('error')
    })
    return () => { active = false }
  }, [logout])

  const quickDestination = (key: typeof quickActions[number]['key']) => {
    if (key === 'doctor') router.navigate({ pathname: '/find-care', params: { mode: 'doctor' } })
    else if (key === 'homeVisit') router.navigate({ pathname: '/find-care', params: { mode: 'home_visit' } })
    else if (key === 'laboratory') router.navigate('/lab-tests')
    else router.navigate('/appointments')
  }

  return <SafeAreaView edges={['top', 'right', 'left']} style={styles.safeArea}>
    <StatusBar style="dark" />
    <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, rowDirection]}>
        <View style={styles.brand}>
          <Image accessibilityIgnoresInvertColors resizeMode="contain"
            source={require('../../assets/images/medaccess-mark.png')} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>MedAccess</Text>
            <Text style={styles.brandCountry}>Sudan</Text>
          </View>
        </View>
        <View style={[styles.headerActions, rowDirection]}>
          <Pressable accessibilityLabel={t('home.logout')} accessibilityRole="button" onPress={() => void logout()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <MaterialIcon color={colors.textPrimary} name="logout" size={24} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.greetingArea, rowDirection]}>
        <View style={styles.greetingCopy}>
          <Text style={[styles.greeting, textDirection, isRTL && arabicFonts.regular]}>{t(`home.greetings.${greetingKey}`)}</Text>
          <Text numberOfLines={1} style={[styles.welcomeName, textDirection, isRTL && arabicFonts.extraBold]}>{user?.first_name || user?.name || t('home.welcome')}</Text>
          <Text style={[styles.prompt, textDirection, isRTL && arabicFonts.regular]}>{t('home.prompt')}</Text>
        </View>
        <View pointerEvents="none" style={styles.greetingDecoration}>
          <View style={styles.greetingOrb} />
          <View style={styles.clinicianBadge}>
            <MaterialIcon color={colors.primary} name="medical_services" size={48} />
          </View>
        </View>
      </View>

      <PatientGlobalSearch />

      <View style={[styles.quickGrid, rowDirection]}>
        {quickActions.map((action) => <Pressable accessibilityRole="button" onPress={() => quickDestination(action.key)}
          key={action.key} style={({ pressed }) => [styles.quickCard, { backgroundColor: action.surface }, pressed && styles.pressed]}>
          <MaterialIcon color={action.color} name={action.icon} size={36} />
          <Text numberOfLines={2} style={[styles.quickLabel, isRTL && arabicFonts.bold]}>{t(`home.quickActions.${action.key}`)}</Text>
        </Pressable>)}
      </View>

      <View style={[styles.banner, rowDirection]}>
        <View style={styles.bannerCopy}>
          <Text style={[styles.bannerTitle, textDirection, isRTL && arabicFonts.extraBold]}>{t('home.banner.title')}</Text>
          <Text style={[styles.bannerDescription, textDirection, isRTL && arabicFonts.regular]}>{t('home.banner.description')}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/find-care')} style={({ pressed }) => [styles.bannerButton, rowDirection, pressed && styles.pressed]}>
            <Text style={[styles.bannerButtonText, isRTL && arabicFonts.bold]}>{t('home.banner.action')}</Text>
            <MaterialIcon color={colors.white} name={isRTL ? 'arrow_back' : 'arrow_forward'} size={21} />
          </Pressable>
        </View>
        <View pointerEvents="none" style={styles.bannerVisualArea}>
          <View style={styles.bannerVisual}>
            <MaterialIcon color={colors.white} name="medical_services" size={38} />
            <View style={styles.pinTail} />
          </View>
        </View>
      </View>

      <MobileSectionHeader action={t('home.seeAll')} onAction={() => router.navigate('/find-care')} title={t('home.popular.title')} />
      <FlatList contentContainerStyle={styles.horizontalContent} data={popularServices} horizontal inverted={shouldMirrorLayout}
        keyExtractor={(service) => service.key} renderItem={({ item: service }) => <Pressable onPress={() => {
          if (service.key === 'laboratory') router.navigate('/lab-tests')
          else if (service.key === 'homeVisit') router.navigate({ pathname: '/find-care', params: { mode: 'home_visit' } })
          else router.navigate({ pathname: '/find-care', params: { mode: 'doctor', specialization: 'general_medicine' } })
        }} style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}>
          <Image resizeMode="cover" source={service.image} style={styles.serviceImage} />
          <View style={styles.serviceBody}>
            <Text numberOfLines={1} style={[styles.cardTitle, textDirection, isRTL && arabicFonts.extraBold]}>{t(`home.popular.${service.key}.title`)}</Text>
            <Text numberOfLines={2} style={[styles.cardDescription, textDirection, isRTL && arabicFonts.regular]}>{t(`home.popular.${service.key}.description`)}</Text>
          </View>
        </Pressable>} showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} />

      <MobileSectionHeader action={t('home.viewAll')} onAction={() => router.navigate('/appointments')} title={t('home.appointment.title')} />
      {appointmentState === 'loading' ? <View accessibilityLabel={t('home.appointment.loading')} accessibilityRole="progressbar" style={styles.appointmentState}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.stateText, textDirection, isRTL && arabicFonts.regular]}>{t('home.appointment.loading')}</Text>
      </View> : appointmentState === 'error' ? <View style={styles.appointmentState}>
        <MaterialIcon color={colors.danger} name="cloud_off" size={30} />
        <Text style={[styles.stateText, textDirection, isRTL && arabicFonts.regular]}>{t('home.appointment.error')}</Text>
        <Pressable accessibilityRole="button" onPress={() => {
          setAppointmentState('loading')
          void loadAppointments()
        }} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
          <Text style={[styles.retryText, isRTL && arabicFonts.bold]}>{t('common.retry')}</Text>
        </Pressable>
      </View> : nextAppointment ? <Pressable accessibilityRole="button" onPress={() => router.navigate('/appointments')} style={({ pressed }) => [styles.emptyAppointment, rowDirection, pressed && styles.pressed]}>
        <View style={styles.emptyIcon}><MaterialIcon color={colors.primary} name="event_available" size={30} /></View>
        <View style={styles.emptyCopy}>
          <Text style={[styles.emptyTitle, textDirection, isRTL && arabicFonts.extraBold]}>{nextAppointment.type === 'laboratory' ? nextAppointment.laboratory_order.laboratory_name : nextAppointment.appointment.doctor.name}</Text>
          <Text style={[styles.emptyDescription, textDirection, isRTL && arabicFonts.regular]}>
            {nextAppointment.type === 'laboratory' ? nextAppointment.laboratory_order.items.map((item) => item.short_name || (language === 'ar' ? item.name_ar : item.name_en)).join(', ') : (language === 'ar' ? nextAppointment.appointment.doctor.specialization.name_ar : nextAppointment.appointment.doctor.specialization.name_en)}
          </Text>
          <Text style={[styles.appointmentTime, textDirection, isRTL && arabicFonts.semiBold]}>{formatMedAccessDateTime(nextAppointment.scheduled_at, language, { dateStyle: 'medium', timeStyle: 'short' })}</Text>
        </View>
      </Pressable> : <View style={[styles.emptyAppointment, rowDirection]}>
          <View style={styles.emptyIcon}><MaterialIcon color={colors.primary} name="event_busy" size={30} /></View>
          <View style={styles.emptyCopy}>
            <Text style={[styles.emptyTitle, textDirection, isRTL && arabicFonts.extraBold]}>{t('home.appointment.emptyTitle')}</Text>
            <Text style={[styles.emptyDescription, textDirection, isRTL && arabicFonts.regular]}>{t('home.appointment.emptyDescription')}</Text>
          </View>
        </View>}

      <MobileSectionHeader title={t('home.tips.title')} />
      <FlatList contentContainerStyle={styles.horizontalContent} data={tips} horizontal inverted={shouldMirrorLayout}
        keyExtractor={(tip) => tip.key} renderItem={({ item: tip }) => <MobileTipCard
          description={t(`home.tips.${tip.key}.description`)} image={tip.image}
          title={t(`home.tips.${tip.key}.title`)} />} showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} />
    </KeyboardAwareScrollView>

  </SafeAreaView>
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  scrollContent: { paddingBottom: spacing.lg, paddingHorizontal: spacing.md },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 70, paddingTop: spacing.sm },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  logo: { height: 46, width: 46 },
  brandName: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', letterSpacing: -0.4, lineHeight: 19 },
  brandCountry: { color: colors.primary, fontSize: 15, fontWeight: '800', lineHeight: 17 },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  iconButton: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: 42, justifyContent: 'center', position: 'relative', width: 42 },
  greetingArea: { alignItems: 'stretch', flexDirection: 'row', minHeight: 178, overflow: 'hidden', paddingTop: spacing.lg },
  greetingCopy: { flexBasis: '62%', flexGrow: 0, flexShrink: 0, justifyContent: 'center', minWidth: 0, paddingBottom: spacing.md },
  greetingDecoration: { flex: 1, minWidth: 0, position: 'relative' },
  greetingOrb: { backgroundColor: '#DDF8F3', borderRadius: 999, height: 170, left: '50%', opacity: 0.75, position: 'absolute', top: 8, transform: [{ translateX: -85 }], width: 170 },
  clinicianBadge: { alignItems: 'center', backgroundColor: '#FFFFFFCC', borderRadius: 999, bottom: 24, height: 88, justifyContent: 'center', left: '50%', position: 'absolute', transform: [{ translateX: -44 }], width: 88 },
  greeting: { color: colors.textSecondary, fontSize: 22, lineHeight: 32 },
  welcomeName: { color: colors.textPrimary, fontSize: 34, fontWeight: '800', letterSpacing: -0.8, lineHeight: 46, marginTop: 2, width: '100%' },
  prompt: { color: colors.textSecondary, fontSize: 17, lineHeight: 27, marginTop: spacing.sm, width: '100%' },
  ltrText: { textAlign: 'left', writingDirection: 'ltr' }, rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  rowReverse: { flexDirection: 'row-reverse' },
  quickGrid: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  quickCard: { alignItems: 'center', borderRadius: radii.lg, flex: 1, gap: 10, justifyContent: 'center', minHeight: 132, paddingHorizontal: 5, paddingVertical: spacing.md },
  quickLabel: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', lineHeight: 17, textAlign: 'center' },
  banner: { alignItems: 'stretch', backgroundColor: '#E5F9F5', borderRadius: radii.lg, flexDirection: 'row', marginTop: spacing.lg, minHeight: 190, overflow: 'hidden', padding: spacing.lg },
  bannerCopy: { flexBasis: '68%', flexGrow: 0, flexShrink: 1, minWidth: 0, zIndex: 2 }, bannerTitle: { color: colors.textPrimary, fontSize: 23, fontWeight: '800', lineHeight: 32 },
  bannerDescription: { color: colors.textSecondary, fontSize: 14, lineHeight: 23, marginTop: spacing.sm, width: '100%' },
  bannerButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radii.pill, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, minHeight: 44, paddingHorizontal: spacing.md },
  bannerButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  bannerVisualArea: { alignItems: 'center', flex: 1, justifyContent: 'center', minWidth: 76 },
  bannerVisual: { alignItems: 'center', backgroundColor: '#10A99A', borderRadius: 999, height: 82, justifyContent: 'center', width: 82 },
  pinTail: { backgroundColor: '#10A99A', bottom: -14, height: 30, position: 'absolute', transform: [{ rotate: '45deg' }], width: 30 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: spacing.xl },
  sectionTitle: { color: colors.textPrimary, flex: 1, flexShrink: 1, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, minWidth: 0 },
  inlineAction: { alignItems: 'center', flexDirection: 'row', flexShrink: 0, gap: 2, marginStart: spacing.sm }, inlineActionText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  horizontalScroll: { marginHorizontal: -spacing.md }, horizontalContent: { gap: 12, paddingHorizontal: spacing.md },
  serviceCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden', width: 218 },
  serviceImage: { height: 106, width: '100%' }, serviceBody: { minHeight: 98, padding: spacing.md },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', lineHeight: 21 },
  cardDescription: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  emptyAppointment: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  appointmentState: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, justifyContent: 'center', minHeight: 122, padding: spacing.lg },
  stateText: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  retryButton: { backgroundColor: colors.primarySurface, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: radii.md, height: 54, justifyContent: 'center', width: 54 },
  emptyCopy: { flex: 1 }, emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyDescription: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  appointmentTime: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 6 },
})
