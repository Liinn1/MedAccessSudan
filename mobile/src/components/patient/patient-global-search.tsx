import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text'
import { MaterialIcon } from '@/components/material-icon'
import { useAppLanguage } from '@/hooks/use-app-language'
import { searchPatientHealthcare, type GlobalSearchResults, type LocalizedOption } from '@/services/patient-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

type SearchState = 'idle' | 'loading' | 'success' | 'empty' | 'error'
type ServiceKey = 'clinic' | 'homeVisit' | 'laboratory'
const emptyResults: GlobalSearchResults = { doctors: [], specializations: [], laboratories: [], tests: [] }
const services: { key: ServiceKey; icon: string }[] = [{ key: 'clinic', icon: 'stethoscope' }, { key: 'homeVisit', icon: 'home_health' }, { key: 'laboratory', icon: 'science' }]

export function PatientGlobalSearch() {
  const { t } = useTranslation()
  const router = useRouter()
  const { language, isRTL, shouldMirrorLayout } = useAppLanguage()
  const [active, setActive] = useState(false)
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>('idle')
  const [results, setResults] = useState(emptyResults)
  const requestId = useRef(0)
  const direction = shouldMirrorLayout ? styles.reverse : undefined
  const alignment = isRTL ? styles.rtl : styles.ltr
  const localized = (value: LocalizedOption) => language === 'ar' ? value.name_ar : value.name_en
  const normalized = query.trim().toLocaleLowerCase(language)
  const matchingServices = services.filter(({ key }) => !normalized || t(`home.globalSearch.services.${key}`).toLocaleLowerCase(language).includes(normalized))

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      requestId.current += 1
      return
    }
    const currentRequest = ++requestId.current
    const timer = setTimeout(() => {
      setState('loading')
      void searchPatientHealthcare(term).then((response) => {
        if (requestId.current !== currentRequest) return
        setResults(response)
        const count = response.doctors.length + response.specializations.length + response.laboratories.length + response.tests.length
        setState(count ? 'success' : 'empty')
      }).catch(() => { if (requestId.current === currentRequest) setState('error') })
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  function updateQuery(value: string) {
    setQuery(value)
    if (value.trim().length < 2) {
      requestId.current += 1
      setResults(emptyResults)
      setState('idle')
    }
  }

  function close() { requestId.current += 1; setActive(false); Keyboard.dismiss() }
  function navigate(pathname: string, params?: Record<string, string>) { close(); router.push(params ? { pathname: pathname as never, params } : pathname as never) }
  function openService(key: ServiceKey) {
    if (key === 'clinic') navigate('/find-care', { mode: 'doctor' })
    else if (key === 'homeVisit') navigate('/find-care', { mode: 'home_visit' })
    else navigate('/lab-tests')
  }

  return <View style={[styles.wrapper, active && styles.wrapperActive]}>
    <View accessibilityRole="search" style={[styles.search, direction, active && styles.searchActive]}>
      <MaterialIcon color={colors.textSecondary} name="search" size={28} />
      <TextInput accessibilityLabel={t('home.searchPlaceholder')} onChangeText={updateQuery} onFocus={() => setActive(true)} placeholder={t('home.searchPlaceholder')} placeholderTextColor={colors.textSecondary} returnKeyType="search" style={[styles.input, alignment, isRTL && arabicFonts.regular]} value={query} />
      {query.length > 0 && <Pressable accessibilityLabel={t('home.globalSearch.clear')} accessibilityRole="button" onPress={() => updateQuery('')} style={styles.iconButton}><MaterialIcon color={colors.textSecondary} name="close" size={20} /></Pressable>}
      {active && <Pressable accessibilityLabel={t('home.globalSearch.dismiss')} accessibilityRole="button" onPress={close} style={styles.iconButton}><MaterialIcon color={colors.textSecondary} name="keyboard_arrow_up" size={22} /></Pressable>}
    </View>
    {active && <View style={styles.panel}>
      <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.resultsScroll}>
        {query.trim().length < 2 ? <ResultGroup title={t('home.globalSearch.quick')}><>{services.map((service) => <ResultRow icon={service.icon} key={service.key} label={t(`home.globalSearch.services.${service.key}`)} onPress={() => openService(service.key)} rtl={isRTL} />)}</></ResultGroup>
          : state === 'loading' ? <View accessibilityRole="progressbar" style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={[styles.stateText, alignment]}>{t('home.globalSearch.loading')}</Text></View>
          : state === 'error' ? <View style={styles.state}><MaterialIcon color={colors.danger} name="cloud_off" size={28} /><Text style={[styles.stateText, alignment]}>{t('home.globalSearch.error')}</Text><Pressable onPress={() => setQuery((value) => `${value} `)} style={styles.retry}><Text style={styles.retryText}>{t('common.retry')}</Text></Pressable></View>
          : state === 'empty' && matchingServices.length === 0 ? <View style={styles.state}><MaterialIcon color={colors.textMuted} name="search_off" size={30} /><Text style={[styles.emptyTitle, alignment]}>{t('home.globalSearch.emptyTitle')}</Text><Text style={[styles.stateText, alignment]}>{t('home.globalSearch.emptyDescription')}</Text></View>
          : <>
            {results.doctors.length > 0 && <ResultGroup title={t('home.globalSearch.groups.doctors')}>{results.doctors.map((doctor) => <ResultRow image={doctor.profile_image_url} key={doctor.id} label={doctor.name} meta={localized(doctor.specialization)} onPress={() => navigate('/find-care', { mode: 'doctor', q: doctor.name })} rtl={isRTL} />)}</ResultGroup>}
            {results.specializations.length > 0 && <ResultGroup title={t('home.globalSearch.groups.specialties')}>{results.specializations.map((specialty) => <ResultRow icon="medical_services" key={specialty.code} label={localized(specialty)} onPress={() => navigate('/find-care', { mode: 'doctor', specialization: specialty.code ?? '' })} rtl={isRTL} />)}</ResultGroup>}
            {results.laboratories.length > 0 && <ResultGroup title={t('home.globalSearch.groups.laboratories')}>{results.laboratories.map((laboratory) => <ResultRow icon="biotech" key={laboratory.id} label={laboratory.name} meta={laboratory.location ? localized(laboratory.location) : undefined} onPress={() => navigate('/lab-tests')} rtl={isRTL} />)}</ResultGroup>}
            {results.tests.length > 0 && <ResultGroup title={t('home.globalSearch.groups.tests')}>{results.tests.map((test) => <ResultRow icon="science" key={test.id} label={localized(test)} meta={test.short_name ?? undefined} onPress={() => navigate('/lab-tests', { q: localized(test) })} rtl={isRTL} />)}</ResultGroup>}
            {matchingServices.length > 0 && <ResultGroup title={t('home.globalSearch.groups.services')}>{matchingServices.map((service) => <ResultRow icon={service.icon} key={service.key} label={t(`home.globalSearch.services.${service.key}`)} onPress={() => openService(service.key)} rtl={isRTL} />)}</ResultGroup>}
          </>}
      </ScrollView>
    </View>}
  </View>
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) { return <View><Text style={styles.groupTitle}>{title}</Text>{children}</View> }
function ResultRow({ label, meta, icon, image, onPress, rtl }: { label: string; meta?: string; icon?: string; image?: string | null; onPress: () => void; rtl: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, rtl && styles.reverse, pressed && styles.pressed]}>
    {image ? <Image source={{ uri: image }} style={styles.avatar} /> : <View style={styles.resultIcon}><MaterialIcon color={colors.primary} name={icon ?? 'person'} size={22} /></View>}
    <View style={styles.copy}><Text style={[styles.label, rtl && styles.rtl, rtl && arabicFonts.bold]}>{label}</Text>{meta && <Text style={[styles.meta, rtl && styles.rtl, rtl && arabicFonts.regular]}>{meta}</Text>}</View>
    <MaterialIcon color={colors.textMuted} name={rtl ? 'chevron_left' : 'chevron_right'} size={21} />
  </Pressable>
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 5 }, wrapperActive: { zIndex: 20 }, search: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 58, paddingHorizontal: spacing.md }, searchActive: { borderColor: colors.primary }, input: { color: colors.textPrimary, flex: 1, fontSize: 15, minHeight: 56, minWidth: 0, paddingVertical: 0 }, iconButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 32 }, panel: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, elevation: 8, left: 0, marginTop: 6, maxHeight: 430, position: 'absolute', right: 0, top: 58, shadowColor: '#0F172A', shadowOffset: { height: 8, width: 0 }, shadowOpacity: .13, shadowRadius: 18 }, resultsScroll: { maxHeight: 428 }, groupTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: .7, paddingBottom: 5, paddingHorizontal: spacing.md, paddingTop: spacing.md, textTransform: 'uppercase' }, row: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 62, paddingHorizontal: spacing.md, paddingVertical: 9 }, reverse: { flexDirection: 'row-reverse' }, resultIcon: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }, avatar: { borderRadius: 20, height: 40, width: 40 }, copy: { flex: 1, minWidth: 0 }, label: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' }, meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 }, ltr: { textAlign: 'left', writingDirection: 'ltr' }, rtl: { textAlign: 'right', writingDirection: 'rtl' }, state: { alignItems: 'center', gap: spacing.sm, minHeight: 130, justifyContent: 'center', padding: spacing.lg }, stateText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' }, emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' }, retry: { backgroundColor: colors.primarySurface, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, retryText: { color: colors.primary, fontSize: 13, fontWeight: '700' }, pressed: { opacity: .68 },
})
