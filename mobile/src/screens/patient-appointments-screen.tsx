import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AppText as Text } from '@/components/app-text'
import { MaterialIcon } from '@/components/material-icon'
import { LoadState, PatientScreen, patientScreenStyles as shared } from '@/components/patient/patient-screen'
import { useAppLanguage } from '@/hooks/use-app-language'
import { getLaboratoryOrders, getPatientAppointments, getPatientUpcomingBookings, type LaboratoryOrder, type PatientAppointment, type PatientUpcomingBooking } from '@/services/patient-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'
import { formatMedAccessDateTime } from '@/utils/date-time'

type Group = 'upcoming' | 'past' | 'cancelled'
type Booking = { kind: 'appointment'; at: number; appointment: PatientAppointment } | { kind: 'laboratory'; at: number; order: LaboratoryOrder }

export function PatientAppointmentsScreen() {
  const { t } = useTranslation()
  const { language, isRTL, shouldMirrorLayout } = useAppLanguage()
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [labOrders, setLabOrders] = useState<LaboratoryOrder[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<PatientUpcomingBooking[]>([])
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [group, setGroup] = useState<Group>('upcoming')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [now] = useState(() => Date.now())
  const load = useCallback(async () => {
    setState('loading')
    try { const [visits, orders, upcoming] = await Promise.all([getPatientAppointments(), getLaboratoryOrders(), getPatientUpcomingBookings()]); setAppointments(visits); setLabOrders(orders); setUpcomingBookings(upcoming); setState('success') }
    catch { setState('error') }
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0)
    return () => clearTimeout(timer)
  }, [load])
  const records = useMemo(() => {
    if (group === 'upcoming') return upcomingBookings.map((booking): Booking => booking.type === 'laboratory'
      ? { kind: 'laboratory', at: new Date(booking.scheduled_at).getTime(), order: booking.laboratory_order }
      : { kind: 'appointment', at: new Date(booking.scheduled_at).getTime(), appointment: booking.appointment })
    const visits: Booking[] = appointments.map((appointment) => ({ kind: 'appointment', at: new Date(appointment.starts_at).getTime(), appointment }))
    const labs: Booking[] = labOrders.map((order) => ({ kind: 'laboratory', at: new Date(order.collection_starts_at || order.requested_at || 0).getTime(), order }))
    return [...visits, ...labs].filter((item) => {
      if (item.kind === 'laboratory') {
        if (group === 'cancelled') return false
        if (group === 'past') return item.order.status === 'result_ready'
        return item.order.status !== 'result_ready'
      }
      if (group === 'cancelled') return item.appointment.status === 'cancelled'
      return item.appointment.status === 'completed' || (item.appointment.status === 'confirmed' && new Date(item.appointment.ends_at).getTime() < now)
    }).sort((a, b) => b.at - a.at)
  }, [appointments, group, labOrders, now, upcomingBookings])
  const direction = shouldMirrorLayout ? shared.reverse : undefined
  const alignment = isRTL ? shared.rtl : shared.ltr
  const date = (value: string) => formatMedAccessDateTime(value, language, { dateStyle: 'medium', timeStyle: 'short' })

  return <PatientScreen subtitle={t('patient.appointments.subtitle')} title={t('patient.appointments.title')}>
    <View accessibilityRole="tablist" style={[styles.tabs, direction]}>{(['upcoming', 'past', 'cancelled'] as const).map((item) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: group === item }} key={item} onPress={() => setGroup(item)} style={[styles.tab, group === item && styles.tabActive]}>
      <Text style={[styles.tabText, group === item && styles.tabTextActive, isRTL && arabicFonts.semiBold]}>{t(`patient.appointments.groups.${item}`)}</Text>
    </Pressable>)}</View>
    {state === 'loading' || state === 'error' ? <LoadState onRetry={() => void load()} state={state} />
      : records.length === 0 ? <LoadState empty={t('patient.appointments.empty')} onRetry={() => void load()} state="empty" />
      : records.map((booking) => {
        if (booking.kind === 'laboratory') return <LaboratoryBookingCard direction={direction} key={`lab-${booking.order.id}`} language={language} order={booking.order} />
        const item = booking.appointment
        const open = expanded === item.id
        const location = item.service_type === 'home_visit' ? [item.home_visit?.area, item.home_visit?.address_details].filter(Boolean).join(', ') : item.doctor.clinic_name || (item.doctor.location ? (language === 'ar' ? item.doctor.location.name_ar : item.doctor.location.name_en) : '')
        return <Pressable accessibilityRole="button" key={`visit-${item.id}`} onPress={() => setExpanded(open ? null : item.id)} style={({ pressed }) => [shared.card, pressed && shared.pressed]}>
          <View style={[styles.cardTop, direction]}><View style={styles.dateIcon}><MaterialIcon color={colors.primary} name="calendar_month" size={28} /></View><View style={styles.grow}>
            <Text style={[shared.heading, alignment, isRTL && arabicFonts.bold]}>{item.doctor.name}</Text>
            <Text style={[shared.body, alignment, isRTL && arabicFonts.regular]}>{language === 'ar' ? item.doctor.specialization.name_ar : item.doctor.specialization.name_en}</Text>
          </View><View style={[styles.status, item.status === 'cancelled' && styles.cancelled]}><Text style={[styles.statusText, item.status === 'cancelled' && styles.cancelledText]}>{t(`patient.appointments.status.${item.status}`)}</Text></View></View>
          <View style={[styles.info, direction]}><MaterialIcon color={colors.textMuted} name="schedule" size={18} /><Text style={[shared.body, alignment]}>{date(item.starts_at)}</Text></View>
          <View style={[styles.info, direction]}><MaterialIcon color={colors.textMuted} name={item.service_type === 'home_visit' ? 'home_health' : 'location_on'} size={18} /><Text style={[shared.body, styles.grow, alignment]}>{location || t(`patient.appointments.types.${item.service_type}`)}</Text></View>
          {open && <View style={styles.details}><Text style={[shared.meta, alignment]}>{t('patient.appointments.reference', { id: item.id })}</Text><Text style={[shared.meta, alignment]}>{t(`patient.appointments.types.${item.service_type}`)}</Text></View>}
        </Pressable>
      })}
  </PatientScreen>
}

function LaboratoryBookingCard({ order, language, direction }: { order: LaboratoryOrder; language: string; direction?: object }) {
  const { t } = useTranslation()
  const { isRTL } = useAppLanguage()
  const alignment = isRTL ? shared.rtl : shared.ltr
  const names = order.items.map((item) => item.short_name || (language === 'ar' ? item.name_ar : item.name_en)).join(', ')
  const scheduled = order.collection_starts_at || order.requested_at
  return <View style={shared.card}><View style={[styles.cardTop, direction]}><View style={styles.labIcon}><MaterialIcon color="#0284C7" name="science" size={28} /></View><View style={styles.grow}><Text style={[shared.heading, alignment]}>{order.laboratory_name}</Text><Text style={[shared.body, alignment]}>{names}</Text></View><View style={styles.status}><Text style={styles.statusText}>{t(`patient.lab.status.${order.status}`)}</Text></View></View>{scheduled && <View style={[styles.info, direction]}><MaterialIcon color={colors.textMuted} name="schedule" size={18} /><Text style={[shared.body, alignment]}>{new Intl.DateTimeFormat(language === 'ar' ? 'ar-SD' : 'en-SD', { dateStyle: 'medium', timeStyle: order.collection_starts_at ? 'short' : undefined }).format(new Date(scheduled))}</Text></View>}<View style={[styles.info, direction]}><MaterialIcon color={colors.textMuted} name={order.collection_method === 'home_collection' ? 'home_health' : 'biotech'} size={18} /><Text style={[shared.body, alignment]}>{t(`patient.lab.collection.${order.collection_method}`)}</Text></View></View>
}

const styles = StyleSheet.create({
  tabs: { backgroundColor: colors.disabled, borderRadius: radii.pill, flexDirection: 'row', padding: 4 }, tab: { alignItems: 'center', borderRadius: radii.pill, flex: 1, paddingHorizontal: 5, paddingVertical: 9 }, tabActive: { backgroundColor: colors.white }, tabText: { color: colors.textSecondary, fontSize: 12 }, tabTextActive: { color: colors.primary, fontWeight: '700' },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, dateIcon: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: radii.md, height: 48, justifyContent: 'center', width: 48 }, grow: { flex: 1, minWidth: 0 }, status: { backgroundColor: colors.successSurface, borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 5 }, statusText: { color: colors.success, fontSize: 10, fontWeight: '700' }, cancelled: { backgroundColor: colors.dangerSurface }, cancelledText: { color: colors.danger }, info: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }, details: { borderTopColor: colors.border, borderTopWidth: 1, gap: 3, marginTop: spacing.md, paddingTop: spacing.sm },
  labIcon: { alignItems: 'center', backgroundColor: '#E8F5FD', borderRadius: radii.md, height: 48, justifyContent: 'center', width: 48 },
})
