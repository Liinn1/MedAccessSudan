import { useCallback, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text'
import { MaterialIcon } from '@/components/material-icon'
import { DoctorLoadState, DoctorScreen } from '@/components/doctor/doctor-screen'
import { useAppLanguage } from '@/hooks/use-app-language'
import { createDoctorScheduleException, deleteDoctorScheduleException, getDoctorSchedule, replaceDoctorSchedule, type ConsultationType, type DoctorSchedule, type SchedulePeriod } from '@/services/doctor-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

const weekdays = [1, 2, 3, 4, 5, 6, 0] as const
const durations = [15, 20, 30, 45, 60, 90, 120] as const
const defaultPeriod = (day: number, additional = false): SchedulePeriod => ({
  day_of_week: day,
  start_time: additional ? '14:00' : '09:00',
  end_time: additional ? '17:00' : '14:00',
  slot_duration_minutes: 30,
  is_active: true,
})

function normalizeSchedule(schedule: DoctorSchedule): DoctorSchedule {
  return {
    ...schedule,
    periods: schedule.periods.map((period) => ({
      ...period,
      start_time: period.start_time.slice(0, 5),
      end_time: period.end_time.slice(0, 5),
    })),
  }
}

function minutes(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null
  const [hours, mins] = value.split(':').map(Number)
  return hours * 60 + mins
}

function isValidSchedule(periods: SchedulePeriod[]) {
  return weekdays.every((day) => {
    const entries = periods.filter((period) => period.day_of_week === day)
      .sort((first, second) => first.start_time.localeCompare(second.start_time))
    return entries.every((period, index) => {
      const start = minutes(period.start_time)
      const end = minutes(period.end_time)
      const previousEnd = index ? minutes(entries[index - 1].end_time) : null
      return start !== null && end !== null && start < end
        && period.slot_duration_minutes >= 10 && period.slot_duration_minutes <= 240
        && period.slot_duration_minutes <= end - start
        && (previousEnd === null || start >= previousEnd)
    })
  })
}

export function DoctorAvailabilityScreen() {
  const { t } = useTranslation()
  const { isRTL, shouldMirrorLayout } = useAppLanguage()
  const [data, setData] = useState<DoctorSchedule | null>(null)
  const [type, setType] = useState<ConsultationType>('clinic')
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [validationError, setValidationError] = useState('')
  const [exceptionDate, setExceptionDate] = useState('')
  const [exceptionType, setExceptionType] = useState<'unavailable' | 'modified' | 'blocked'>('unavailable')
  const [exceptionStart, setExceptionStart] = useState('09:00')
  const [exceptionEnd, setExceptionEnd] = useState('12:00')

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setState('loading')
    setMessage('')
    try {
      setData(normalizeSchedule(await getDoctorSchedule()))
      setState('success')
    } catch {
      setState('error')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  const periods = useMemo(
    () => data?.periods.filter((period) => (period.consultation_type ?? 'clinic') === type) ?? [],
    [data, type],
  )
  const selectedPeriods = useMemo(
    () => periods.map((period, index) => ({ period, index })).filter(({ period }) => period.day_of_week === selectedDay),
    [periods, selectedDay],
  )
  const offered = type === 'clinic' ? data?.offers_clinic_visits : data?.offers_home_visits
  const reverse = shouldMirrorLayout ? styles.reverse : undefined
  const rtl = isRTL ? styles.rtl : undefined

  function updatePeriod(index: number, key: 'start_time' | 'end_time' | 'slot_duration_minutes', value: string | number) {
    if (!data) return
    const selected = periods[index]
    setValidationError('')
    setData({ ...data, periods: data.periods.map((period) => period === selected ? { ...period, [key]: value } : period) })
  }

  function toggleSelectedDay(enabled: boolean) {
    if (!data) return
    setValidationError('')
    const otherPeriods = data.periods.filter((period) => !(
      (period.consultation_type ?? 'clinic') === type && period.day_of_week === selectedDay
    ))
    setData({
      ...data,
      periods: enabled ? [...otherPeriods, { ...defaultPeriod(selectedDay), consultation_type: type }] : otherPeriods,
    })
  }

  function addPeriod() {
    if (!data || selectedPeriods.length >= 3) return
    setValidationError('')
    setData({
      ...data,
      periods: [...data.periods, { ...defaultPeriod(selectedDay, selectedPeriods.length > 0), consultation_type: type }],
    })
  }

  function removePeriod(index: number) {
    if (!data) return
    const selected = periods[index]
    setValidationError('')
    setData({ ...data, periods: data.periods.filter((period) => period !== selected) })
  }

  async function save() {
    if (!isValidSchedule(periods)) {
      setValidationError(t('doctor.availability.validationError'))
      return
    }
    setSaving(true)
    setMessage('')
    setValidationError('')
    try {
      const payload = periods.map(({ id: _, is_active: __, ...period }) => ({ ...period, consultation_type: type }))
      const updated = normalizeSchedule(await replaceDoctorSchedule(type, payload))
      setData((current) => current ? {
        ...current,
        offers_clinic_visits: updated.offers_clinic_visits,
        offers_home_visits: updated.offers_home_visits,
        periods: [...current.periods.filter((period) => (period.consultation_type ?? 'clinic') !== type), ...updated.periods],
        exceptions: [...current.exceptions.filter((item) => (item.consultation_type ?? 'clinic') !== type), ...updated.exceptions],
      } : updated)
      setMessage(t('doctor.availability.saved'))
    } catch {
      setMessage(t('doctor.availability.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function addException() {
    const validRange = exceptionType === 'unavailable'
      || (minutes(exceptionStart) !== null && minutes(exceptionEnd) !== null && exceptionStart < exceptionEnd)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exceptionDate) || !validRange) {
      setMessage(t('doctor.availability.dateError'))
      return
    }
    setSaving(true)
    try {
      await createDoctorScheduleException({ exception_date: exceptionDate, type: exceptionType, consultation_type: type, start_time: exceptionType === 'unavailable' ? null : exceptionStart, end_time: exceptionType === 'unavailable' ? null : exceptionEnd })
      setExceptionDate('')
      await load()
      setMessage(t('doctor.availability.exceptionSaved'))
    } catch {
      setMessage(t('doctor.availability.exceptionError'))
    } finally {
      setSaving(false)
    }
  }

  async function removeException(id: number) {
    setSaving(true)
    try {
      await deleteDoctorScheduleException(id)
      await load()
      setMessage(t('doctor.availability.exceptionRemoved'))
    } catch {
      setMessage(t('doctor.availability.exceptionError'))
    } finally {
      setSaving(false)
    }
  }

  const selectedDayAvailable = selectedPeriods.length > 0

  return <DoctorScreen title={t('doctor.availability.title')} subtitle={t('doctor.availability.subtitle')}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}>
    <View style={[styles.tabs, reverse]}>
      {(['clinic', 'home_visit'] as const).map((item) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: type === item }} key={item}
        onPress={() => { setType(item); setMessage(''); setValidationError('') }} style={[styles.tab, type === item && styles.tabActive]}>
        <MaterialIcon color={type === item ? colors.white : colors.primary} name={item === 'clinic' ? 'apartment' : 'home_health'} size={21} />
        <Text style={[styles.tabText, type === item && styles.tabTextActive, isRTL && arabicFonts.bold]}>{t(`doctor.appointments.types.${item}`)}</Text>
      </Pressable>)}
    </View>

    {state === 'loading' ? <DoctorLoadState onRetry={load} state="loading" />
      : state === 'error' ? <DoctorLoadState onRetry={load} state="error" />
        : !offered ? <View style={styles.notice}><Text style={[styles.body, rtl]}>{t('doctor.availability.notOffered')}</Text></View>
          : <>
            <View style={styles.scheduleCard}>
              <Text style={[styles.sectionTitle, rtl, isRTL && arabicFonts.extraBold]}>{t('doctor.availability.weeklySchedule')}</Text>
              <Text style={[styles.body, rtl, isRTL && arabicFonts.regular]}>{t('doctor.availability.weeklyHelp')}</Text>
              <ScrollView contentContainerStyle={styles.daySelector} horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                {weekdays.map((day) => {
                  const selected = selectedDay === day
                  const available = periods.some((period) => period.day_of_week === day)
                  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={day}
                    onPress={() => { setSelectedDay(day); setValidationError('') }} style={[styles.dayChip, selected && styles.dayChipSelected]}>
                    <Text style={[styles.dayChipShort, selected && styles.dayChipTextSelected, isRTL && arabicFonts.bold]}>{t(`doctor.availability.dayShort.${day}`)}</Text>
                    <View style={[styles.dayDot, available && styles.dayDotAvailable, selected && available && styles.dayDotSelected]} />
                  </Pressable>
                })}
              </ScrollView>

              <View style={[styles.selectedDayHeader, reverse]}>
                <View style={styles.grow}>
                  <Text style={[styles.selectedDayTitle, rtl, isRTL && arabicFonts.extraBold]}>{t(`doctor.availability.days.${selectedDay}`)}</Text>
                  <Text style={[styles.availabilityState, rtl, isRTL && arabicFonts.regular]}>{t(selectedDayAvailable ? 'doctor.availability.available' : 'doctor.availability.unavailable')}</Text>
                </View>
                <Switch accessibilityLabel={t('doctor.availability.availableToggle')} ios_backgroundColor={colors.border}
                  onValueChange={toggleSelectedDay} thumbColor={colors.white} trackColor={{ false: colors.border, true: colors.primary }} value={selectedDayAvailable} />
              </View>

              {selectedDayAvailable ? <View style={styles.periodList}>
                {selectedPeriods.map(({ period, index }, position) => <View key={`${selectedDay}-${index}`} style={styles.period}>
                  <View style={[styles.periodHead, reverse]}>
                    <Text style={[styles.periodTitle, rtl, isRTL && arabicFonts.bold]}>{t('doctor.availability.period', { count: position + 1 })}</Text>
                    <Pressable accessibilityLabel={t('doctor.availability.remove')} accessibilityRole="button" hitSlop={8} onPress={() => removePeriod(index)} style={styles.removeButton}>
                      <MaterialIcon color={colors.danger} name="delete" size={21} />
                    </Pressable>
                  </View>
                  <View style={[styles.timeRow, reverse]}>
                    <TimeField label={t('doctor.availability.start')} onChange={(value) => updatePeriod(index, 'start_time', value)} value={period.start_time.slice(0, 5)} />
                    <View style={styles.timeArrow}><MaterialIcon color={colors.textMuted} name={isRTL ? 'arrow_back' : 'arrow_forward'} size={20} /></View>
                    <TimeField label={t('doctor.availability.end')} onChange={(value) => updatePeriod(index, 'end_time', value)} value={period.end_time.slice(0, 5)} />
                  </View>
                  <Text style={[styles.fieldLabel, rtl]}>{t('doctor.availability.duration')}</Text>
                  <View style={[styles.durationOptions, reverse]}>
                    {durations.map((duration) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: period.slot_duration_minutes === duration }} key={duration}
                      onPress={() => updatePeriod(index, 'slot_duration_minutes', duration)} style={[styles.durationChip, period.slot_duration_minutes === duration && styles.durationChipActive]}>
                      <Text style={[styles.durationText, period.slot_duration_minutes === duration && styles.durationTextActive]}>{t('doctor.availability.minutes', { count: duration })}</Text>
                    </Pressable>)}
                  </View>
                </View>)}
                {selectedPeriods.length < 3 && <Pressable accessibilityRole="button" onPress={addPeriod} style={styles.add}>
                  <MaterialIcon color={colors.primary} name="add" size={21} />
                  <Text style={[styles.addText, isRTL && arabicFonts.bold]}>{t('doctor.availability.addAnother')}</Text>
                </Pressable>}
              </View> : <View style={styles.unavailableState}>
                <MaterialIcon color={colors.textMuted} name="event_busy" size={30} />
                <Text style={[styles.body, styles.centerText, isRTL && arabicFonts.regular]}>{t('doctor.availability.unavailableHelp')}</Text>
              </View>}

              {!!validationError && <Text accessibilityLiveRegion="polite" style={[styles.error, rtl]}>{validationError}</Text>}
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={[styles.save, saving && styles.disabled]}>
                <Text style={[styles.saveText, isRTL && arabicFonts.bold]}>{t(saving ? 'doctor.availability.saving' : 'doctor.availability.save')}</Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionTitle, rtl, isRTL && arabicFonts.extraBold]}>{t('doctor.availability.exceptions')}</Text>
            <View style={styles.period}>
              <Field label={t('doctor.availability.exceptionDate')} value={exceptionDate} onChange={setExceptionDate} />
              <View style={[styles.exceptionTypes, reverse]}>
                {(['unavailable', 'modified', 'blocked'] as const).map((item) => <Pressable key={item} onPress={() => setExceptionType(item)} style={[styles.smallChip, exceptionType === item && styles.smallChipActive]}>
                  <Text style={[styles.smallChipText, exceptionType === item && styles.smallChipTextActive]}>{t(`doctor.availability.exceptionTypes.${item}`)}</Text>
                </Pressable>)}
              </View>
              {exceptionType !== 'unavailable' && <View style={[styles.timeRow, reverse]}>
                <TimeField label={t('doctor.availability.start')} value={exceptionStart} onChange={setExceptionStart} />
                <View style={styles.timeArrow}><MaterialIcon color={colors.textMuted} name={isRTL ? 'arrow_back' : 'arrow_forward'} size={20} /></View>
                <TimeField label={t('doctor.availability.end')} value={exceptionEnd} onChange={setExceptionEnd} />
              </View>}
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => void addException()} style={styles.add}><Text style={styles.addText}>{t('doctor.availability.addException')}</Text></Pressable>
            </View>
            {data?.exceptions.filter((item) => (item.consultation_type ?? 'clinic') === type).map((item) => <View key={item.id} style={[styles.exceptionRow, reverse]}>
              <View style={styles.grow}>
                <Text style={[styles.periodTitle, rtl]}>{item.exception_date}</Text>
                <Text style={[styles.body, rtl]}>{t(`doctor.availability.exceptionTypes.${item.type}`)}{item.start_time ? ` · ${item.start_time.slice(0, 5)}–${item.end_time?.slice(0, 5)}` : ''}</Text>
              </View>
              <Pressable accessibilityLabel={t('doctor.availability.remove')} disabled={saving} onPress={() => void removeException(item.id)}><MaterialIcon color={colors.danger} name="delete" size={21} /></Pressable>
            </View>)}
            {!!message && <Text accessibilityLiveRegion="polite" style={[styles.message, rtl]}>{message}</Text>}
          </>}
  </DoctorScreen>
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View style={styles.timeField}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label}
    keyboardType="numbers-and-punctuation" maxLength={5} onChangeText={onChange} placeholder="09:00" style={styles.timeInput} value={value} /></View>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput onChangeText={onChange} style={styles.input} value={value} /></View>
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm }, reverse: { flexDirection: 'row-reverse' },
  tab: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.primary, borderRadius: radii.pill, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 46 },
  tabActive: { backgroundColor: colors.primary }, tabText: { color: colors.primary, fontSize: 12, fontWeight: '700' }, tabTextActive: { color: colors.white },
  notice: { backgroundColor: colors.primarySurface, borderRadius: radii.lg, padding: spacing.lg },
  scheduleCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', lineHeight: 28, marginTop: spacing.sm }, body: { color: colors.textSecondary, fontSize: 13, lineHeight: 22 }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
  dayScroll: { marginHorizontal: -spacing.md, marginTop: spacing.md }, daySelector: { gap: 8, paddingHorizontal: spacing.md },
  dayChip: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: 7, justifyContent: 'center', minHeight: 62, minWidth: 58, paddingHorizontal: 11 },
  dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, dayChipShort: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' }, dayChipTextSelected: { color: colors.white },
  dayDot: { backgroundColor: colors.border, borderRadius: 999, height: 6, width: 6 }, dayDotAvailable: { backgroundColor: colors.success }, dayDotSelected: { backgroundColor: colors.white },
  selectedDayHeader: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', marginTop: spacing.lg, paddingBottom: spacing.md },
  selectedDayTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' }, availabilityState: { color: colors.textSecondary, fontSize: 12, marginTop: 2 }, grow: { flex: 1 },
  periodList: { gap: spacing.md, paddingTop: spacing.md }, period: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  periodHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, periodTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  removeButton: { alignItems: 'center', backgroundColor: colors.dangerSurface, borderRadius: radii.pill, height: 36, justifyContent: 'center', width: 36 },
  timeRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 }, timeField: { flex: 1 }, timeArrow: { alignItems: 'center', height: 48, justifyContent: 'center', width: 24 },
  field: { width: '100%' }, fieldLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 5 },
  input: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 14, minHeight: 48, paddingHorizontal: spacing.md },
  timeInput: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 15, minHeight: 48, paddingHorizontal: 8, textAlign: 'center', writingDirection: 'ltr' },
  durationOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, durationChip: { borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7 },
  durationChipActive: { backgroundColor: colors.primarySurface, borderColor: colors.primary }, durationText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' }, durationTextActive: { color: colors.primary, fontWeight: '800' },
  add: { alignItems: 'center', borderColor: colors.primary, borderRadius: radii.pill, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 48 }, addText: { color: colors.primary, fontWeight: '700' },
  unavailableState: { alignItems: 'center', backgroundColor: colors.background, borderRadius: radii.md, gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md, minHeight: 116, padding: spacing.md }, centerText: { textAlign: 'center' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 19, marginTop: spacing.md }, save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.pill, justifyContent: 'center', marginTop: spacing.lg, minHeight: 52 }, saveText: { color: colors.white, fontWeight: '700' },
  disabled: { opacity: .5 }, message: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' }, exceptionTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallChip: { borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 }, smallChipActive: { backgroundColor: colors.primary }, smallChipText: { color: colors.textSecondary, fontSize: 11 }, smallChipTextActive: { color: colors.white },
  exceptionRow: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', padding: spacing.md },
})
