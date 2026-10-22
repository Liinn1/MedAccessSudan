import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { MaterialIcon } from '@/components/material-icon'
import { LoadState, PatientScreen, patientScreenStyles as shared } from '@/components/patient/patient-screen'
import { useAppLanguage } from '@/hooks/use-app-language'
import { getDoctorFilters, getLaboratoryTests, searchPatientDoctors, type DoctorFilters, type DoctorSummary, type LaboratoryTest } from '@/services/patient-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

type Mode = 'gateway' | 'clinic' | 'home_visit'

export function PatientFindCareScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ mode?: string; q?: string; specialization?: string }>()
  const { language, isRTL, shouldMirrorLayout } = useAppLanguage()
  const [mode, setMode] = useState<Mode>(params.mode === 'home_visit' ? 'home_visit' : params.mode === 'doctor' ? 'clinic' : 'gateway')
  const [filters, setFilters] = useState<DoctorFilters | null>(null)
  const [location, setLocation] = useState('')
  const [doctors, setDoctors] = useState<DoctorSummary[]>([])
  const [tests, setTests] = useState<LaboratoryTest[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const q = typeof params.q === 'string' ? params.q.trim() : ''
  const specialization = typeof params.specialization === 'string' ? params.specialization : undefined
  const text = (value: { name_en: string; name_ar: string }) => language === 'ar' ? value.name_ar : value.name_en

  const load = useCallback(async () => {
    if (mode === 'gateway' && !q) return
    if (mode === 'home_visit' && !location) return
    setState('loading')
    try {
      const [doctorRecords, labRecords] = await Promise.all([
        searchPatientDoctors({ serviceType: mode === 'home_visit' ? 'home_visit' : 'clinic', specialization, location: location || undefined }),
        q ? getLaboratoryTests(q) : Promise.resolve([]),
      ])
      const term = q.toLocaleLowerCase(language)
      setDoctors(term ? doctorRecords.filter((doctor) => [doctor.name, doctor.clinic_name, doctor.specialization.name_en, doctor.specialization.name_ar]
        .filter(Boolean).some((value) => String(value).toLocaleLowerCase(language).includes(term))) : doctorRecords)
      setTests(labRecords)
      setState('success')
    } catch { setState('error') }
  }, [language, location, mode, q, specialization])

  useEffect(() => {
    let active = true
    void getDoctorFilters().then((records) => { if (active) setFilters(records) }).catch(() => undefined)
    return () => { active = false }
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => setMode(params.mode === 'home_visit' ? 'home_visit' : params.mode === 'doctor' ? 'clinic' : q ? 'clinic' : 'gateway'), 0)
    return () => clearTimeout(timer)
  }, [params.mode, q])
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0)
    return () => clearTimeout(timer)
  }, [load])

  const resultsEmpty = useMemo(() => doctors.length === 0 && tests.length === 0, [doctors, tests])
  const direction = shouldMirrorLayout ? shared.reverse : undefined
  const alignment = isRTL ? shared.rtl : shared.ltr

  return <PatientScreen subtitle={t('patient.findCare.subtitle')} title={t('patient.findCare.title')}>
    <View style={[styles.gatewayRow, direction]}>
      <Pressable accessibilityRole="button" onPress={() => { setMode('clinic'); setLocation('') }} style={({ pressed }) => [styles.gateway, mode === 'clinic' && styles.gatewayActive, pressed && shared.pressed]}>
        <MaterialIcon color={colors.primary} name="stethoscope" size={34} />
        <Text style={[styles.gatewayTitle, isRTL && arabicFonts.bold]}>{t('patient.findCare.doctor')}</Text>
        <Text style={[styles.gatewayBody, alignment, isRTL && arabicFonts.regular]}>{t('patient.findCare.doctorDescription')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setMode('home_visit')} style={({ pressed }) => [styles.gateway, mode === 'home_visit' && styles.gatewayActive, pressed && shared.pressed]}>
        <MaterialIcon color="#EA7A2D" name="home_health" size={34} />
        <Text style={[styles.gatewayTitle, isRTL && arabicFonts.bold]}>{t('patient.findCare.homeVisit')}</Text>
        <Text style={[styles.gatewayBody, alignment, isRTL && arabicFonts.regular]}>{t('patient.findCare.homeVisitDescription')}</Text>
      </Pressable>
    </View>

    {mode === 'home_visit' && <View style={shared.card}>
      <Text style={[shared.heading, alignment, isRTL && arabicFonts.bold]}>{t('patient.findCare.chooseCity')}</Text>
      <View style={[styles.chips, direction]}>{filters?.locations.map((item) => <Pressable key={item.code} onPress={() => setLocation(item.code ?? '')} style={[styles.chip, location === item.code && styles.chipActive]}>
        <Text style={[styles.chipText, location === item.code && styles.chipTextActive, isRTL && arabicFonts.semiBold]}>{text(item)}</Text>
      </Pressable>)}</View>
    </View>}

    {mode === 'gateway' && !q ? <View style={styles.hint}><MaterialIcon color={colors.primary} name="touch_app" size={30} /><Text style={[shared.body, alignment, isRTL && arabicFonts.regular]}>{t('patient.findCare.chooseService')}</Text></View>
      : mode === 'home_visit' && !location ? null
      : state === 'loading' || state === 'error' ? <LoadState onRetry={() => void load()} state={state} />
      : state === 'success' && resultsEmpty ? <LoadState empty={t('patient.findCare.empty')} onRetry={() => void load()} state="empty" />
      : <>
        {doctors.length > 0 && <Text style={[styles.sectionTitle, alignment, isRTL && arabicFonts.extraBold]}>{t('patient.findCare.doctors')}</Text>}
        {doctors.map((doctor) => <View key={doctor.id} style={[shared.card, styles.doctorCard, direction]}>
          {doctor.profile_image_url ? <Image source={{ uri: doctor.profile_image_url }} style={styles.avatar} /> : <View style={styles.avatarFallback}><MaterialIcon color={colors.primary} name="person" size={30} /></View>}
          <View style={styles.grow}>
            <Text style={[shared.heading, alignment, isRTL && arabicFonts.bold]}>{doctor.name}</Text>
            <Text style={[shared.body, alignment, isRTL && arabicFonts.regular]}>{text(doctor.specialization)}</Text>
            <Text style={[shared.meta, alignment, isRTL && arabicFonts.regular]}>{doctor.clinic_name || text(doctor.home_visit_location || doctor.location || doctor.specialization)}</Text>
          </View>
        </View>)}
        {tests.length > 0 && <Text style={[styles.sectionTitle, alignment, isRTL && arabicFonts.extraBold]}>{t('patient.findCare.labMatches')}</Text>}
        {tests.map((test) => <Pressable key={test.id} onPress={() => router.navigate({ pathname: '/lab-tests', params: { q } })} style={({ pressed }) => [shared.card, styles.labResult, direction, pressed && shared.pressed]}>
          <MaterialIcon color="#0284C7" name="science" size={29} /><View style={styles.grow}><Text style={[shared.heading, alignment, isRTL && arabicFonts.bold]}>{text(test)}</Text><Text style={[shared.meta, alignment]}>{t('patient.lab.availableLabs', { count: test.laboratory_count })}</Text></View>
        </Pressable>)}
      </>}
  </PatientScreen>
}

const styles = StyleSheet.create({
  gatewayRow: { flexDirection: 'row', gap: spacing.sm },
  gateway: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, flex: 1, gap: spacing.sm, minHeight: 170, padding: spacing.md },
  gatewayActive: { backgroundColor: colors.primarySurface, borderColor: colors.primary },
  gatewayTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', lineHeight: 24 }, gatewayBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }, chip: { backgroundColor: colors.disabled, borderRadius: radii.pill, paddingHorizontal: 13, paddingVertical: 8 }, chipActive: { backgroundColor: colors.primary }, chipText: { color: colors.textSecondary, fontSize: 12 }, chipTextActive: { color: colors.white },
  hint: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl }, sectionTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: spacing.sm },
  doctorCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, avatar: { borderRadius: 28, height: 56, width: 56 }, avatarFallback: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: 28, height: 56, justifyContent: 'center', width: 56 }, grow: { flex: 1, minWidth: 0 },
  labResult: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
})
