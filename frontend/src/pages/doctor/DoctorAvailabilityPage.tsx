import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '../../components/feedback/LoadingState'
import { DoctorLayout } from '../../layouts/DoctorLayout'
import { ApiError } from '../../services/apiClient'
import { CONSULTATION_TYPE, type ConsultationType } from '../../services/doctorDashboardService'
import { createAvailabilityException, deleteAvailabilityException, getDoctorSchedule, getResolvedDoctorAvailability, replaceDoctorSchedule, updateAvailabilityException, type AvailabilityException, type ExceptionInput, type ResolvedDate, type SchedulePeriod } from '../../services/doctorAvailabilityService'

const weekdays = [0, 1, 2, 3, 4, 5, 6] as const
const defaultPeriod = (day: number): SchedulePeriod => ({ day_of_week: day, start_time: '09:00', end_time: '14:00', slot_duration_minutes: 30, is_active: true })
const emptyException = (consultationType: ConsultationType): ExceptionInput => ({ exception_date: '', type: 'unavailable', start_time: null, end_time: null, consultation_type: consultationType })

export function DoctorAvailabilityPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [offersClinic, setOffersClinic] = useState(true)
  const [offersHome, setOffersHome] = useState(false)
  const [activeType, setActiveType] = useState<ConsultationType>(CONSULTATION_TYPE.CLINIC)
  const [periods, setPeriods] = useState<SchedulePeriod[]>([])
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [resolved, setResolved] = useState<ResolvedDate[]>([])
  const [exceptionForm, setExceptionForm] = useState<ExceptionInput>(emptyException(CONSULTATION_TYPE.CLINIC))
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const availableTypes = [
    ...(offersClinic ? [CONSULTATION_TYPE.CLINIC] : []),
    ...(offersHome ? [CONSULTATION_TYPE.HOME_VISIT] : []),
  ] as ConsultationType[]

  const load = useCallback(async (signal?: AbortSignal, type: ConsultationType = CONSULTATION_TYPE.CLINIC) => {
    try {
      const [schedule, availability] = await Promise.all([
        getDoctorSchedule(signal, type),
        getResolvedDoctorAvailability(signal, type),
      ])
      setOffersClinic(schedule.offers_clinic_visits)
      setOffersHome(schedule.offers_home_visits)
      const types = [
        ...(schedule.offers_clinic_visits ? [CONSULTATION_TYPE.CLINIC] : []),
        ...(schedule.offers_home_visits ? [CONSULTATION_TYPE.HOME_VISIT] : []),
      ] as ConsultationType[]
      const nextType = types.includes(type) ? type : types[0] ?? CONSULTATION_TYPE.CLINIC
      if (nextType !== type) {
        const [typedSchedule, typedAvailability] = await Promise.all([
          getDoctorSchedule(signal, nextType),
          getResolvedDoctorAvailability(signal, nextType),
        ])
        setActiveType(nextType)
        setPeriods(typedSchedule.periods.map((period) => ({ ...period, start_time: period.start_time.slice(0, 5), end_time: period.end_time.slice(0, 5) })))
        setExceptions(typedSchedule.exceptions)
        setResolved(typedAvailability.dates)
        setExceptionForm(emptyException(nextType))
        return
      }
      setActiveType(nextType)
      setPeriods(schedule.periods.map((period) => ({ ...period, start_time: period.start_time.slice(0, 5), end_time: period.end_time.slice(0, 5) })))
      setExceptions(schedule.exceptions)
      setResolved(availability.dates)
      setExceptionForm((current) => ({ ...current, consultation_type: nextType }))
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true })
      else if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage('doctor.availability.errors.load')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void load(controller.signal), 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [load])

  const entriesFor = (day: number) => periods.map((period, index) => ({ period, index })).filter(({ period }) => period.day_of_week === day)
  const updatePeriod = (index: number, field: keyof SchedulePeriod, value: string | number) => setPeriods((current) => current.map((period, position) => position === index ? { ...period, [field]: value } : period))
  const toggleDay = (day: number) => setPeriods((current) => current.some((period) => period.day_of_week === day) ? current.filter((period) => period.day_of_week !== day) : [...current, defaultPeriod(day)])
  function validSchedule() {
    return weekdays.every((day) => {
      const entries = periods.filter((period) => period.day_of_week === day).sort((first, second) => first.start_time.localeCompare(second.start_time))
      return entries.every((period, index) => {
        const minutes = (Number(period.end_time.slice(0, 2)) * 60 + Number(period.end_time.slice(3))) - (Number(period.start_time.slice(0, 2)) * 60 + Number(period.start_time.slice(3)))
        return period.start_time < period.end_time && period.slot_duration_minutes >= 10 && period.slot_duration_minutes <= 240 && period.slot_duration_minutes <= minutes && !(index && period.start_time < entries[index - 1].end_time)
      })
    })
  }
  async function saveSchedule() {
    if (!validSchedule()) { setMessage('doctor.availability.errors.schedule'); return }
    setBusy('schedule'); setMessage('')
    try {
      const data = await replaceDoctorSchedule(activeType, periods)
      setPeriods(data.periods.map((period) => ({ ...period, start_time: period.start_time.slice(0, 5), end_time: period.end_time.slice(0, 5) })))
      setResolved((await getResolvedDoctorAvailability(undefined, activeType)).dates)
      setMessage('doctor.availability.messages.scheduleSaved')
    } catch { setMessage('doctor.availability.errors.schedule') } finally { setBusy('') }
  }
  async function saveException() {
    if (!exceptionForm.exception_date || (exceptionForm.type !== 'unavailable' && (!exceptionForm.start_time || !exceptionForm.end_time || exceptionForm.start_time >= exceptionForm.end_time))) {
      setMessage('doctor.availability.errors.exception'); return
    }
    setBusy('exception')
    try {
      const payload = { ...exceptionForm, consultation_type: activeType }
      if (editingId) await updateAvailabilityException(editingId, payload)
      else await createAvailabilityException(payload)
      setExceptionForm(emptyException(activeType)); setEditingId(null); await load(undefined, activeType); setMessage('doctor.availability.messages.exceptionSaved')
    } catch { setMessage('doctor.availability.errors.exception') } finally { setBusy('') }
  }
  async function removeException(id: number) {
    setBusy(`delete-${id}`)
    try { await deleteAvailabilityException(id); await load(undefined, activeType); setMessage('doctor.availability.messages.exceptionRemoved') } catch { setMessage('doctor.availability.errors.exception') } finally { setBusy('') }
  }
  function editException(item: AvailabilityException) {
    setEditingId(item.id)
    setExceptionForm({ exception_date: item.exception_date.slice(0, 10), type: item.type, start_time: item.start_time?.slice(0, 5), end_time: item.end_time?.slice(0, 5), consultation_type: activeType })
  }
  async function switchType(type: ConsultationType) {
    if (type === activeType) return
    setLoading(true)
    setEditingId(null)
    setExceptionForm(emptyException(type))
    await load(undefined, type)
  }
  const locale = i18n.language.startsWith('ar') ? 'ar-SD' : 'en'
  const slots = resolved.flatMap((date) => date.slots).slice(0, 12)

  return (
    <DoctorLayout activeSection="availability">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-10">
        <header>
          <p className="font-bold text-[var(--color-primary)]">{t('doctor.availability.eyebrow')}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('doctor.availability.title')}</h1>
          <p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('doctor.availability.description')}</p>
        </header>
        {availableTypes.length > 1 && (
          <div className="mt-6 inline-flex rounded-2xl bg-slate-100 p-1">
            {availableTypes.map((type) => (
              <button className={`rounded-xl px-4 py-2 text-sm font-bold ${activeType === type ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`} key={type} onClick={() => void switchType(type)} type="button">
                {t(`doctor.consultation.${type === 'clinic' ? 'clinic' : 'homeVisit'}`)}
              </button>
            ))}
          </div>
        )}
        {loading ? <div className="mt-8"><LoadingState message={t('doctor.availability.loading')} section /></div> : <>
          <section className="mt-7 rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold">{t('doctor.availability.weeklyTitle')}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('doctor.availability.weeklyDescription')}</p>
              </div>
              <button className="rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white disabled:opacity-50" disabled={busy === 'schedule'} onClick={saveSchedule}>{t(busy === 'schedule' ? 'doctor.availability.saving' : 'doctor.availability.saveSchedule')}</button>
            </div>
            <div className="mt-6 grid gap-4">{weekdays.map((day) => {
              const entries = entriesFor(day)
              const enabled = entries.length > 0
              return <article className="rounded-2xl border border-[var(--color-border)] bg-slate-50 p-4" key={day}><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">{t(`doctor.availability.days.${day}`)}</h3><label className="flex cursor-pointer items-center gap-2 font-semibold"><input checked={enabled} className="size-5 accent-[var(--color-primary)]" onChange={() => toggleDay(day)} type="checkbox" />{t(enabled ? 'doctor.availability.available' : 'doctor.availability.unavailable')}</label></div>{enabled && <div className="mt-4 grid gap-3">{entries.map(({ period, index }) => <div className="grid items-end gap-3 rounded-xl bg-white p-3 sm:grid-cols-[1fr_1fr_1fr_auto]" key={`${day}-${index}`}><label className="text-sm font-semibold">{t('doctor.availability.start')}<input className="direction-ltr mt-1 block w-full rounded-xl border border-[var(--color-border)] px-3 py-2" onChange={(event) => updatePeriod(index, 'start_time', event.target.value)} type="time" value={period.start_time} /></label><label className="text-sm font-semibold">{t('doctor.availability.end')}<input className="direction-ltr mt-1 block w-full rounded-xl border border-[var(--color-border)] px-3 py-2" onChange={(event) => updatePeriod(index, 'end_time', event.target.value)} type="time" value={period.end_time} /></label><label className="text-sm font-semibold">{t('doctor.availability.duration')}<select className="mt-1 block w-full rounded-xl border border-[var(--color-border)] px-3 py-2" onChange={(event) => updatePeriod(index, 'slot_duration_minutes', Number(event.target.value))} value={period.slot_duration_minutes}>{[15, 20, 30, 45, 60, 90, 120].map((duration) => <option key={duration} value={duration}>{t('doctor.availability.minutes', { count: duration })}</option>)}</select></label><button className="rounded-full border border-red-200 px-4 py-2 font-bold text-red-700" onClick={() => setPeriods((current) => current.filter((_, position) => position !== index))}>{t('doctor.availability.remove')}</button></div>)}{entries.length < 3 && <button className="justify-self-start rounded-full border border-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary)]" onClick={() => setPeriods((current) => [...current, { ...defaultPeriod(day), start_time: '14:00', end_time: '17:00' }])}>{t('doctor.availability.addPeriod')}</button>}</div>}</article>
            })}</div>
          </section>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-extrabold">{t('doctor.availability.previewTitle')}</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('doctor.availability.previewDescription')}</p>
              <div className="mt-4 flex flex-wrap gap-2">{slots.length ? slots.map((slot) => <span className="rounded-full bg-[var(--color-primary-surface)] px-3 py-2 text-sm font-bold text-[var(--color-primary)]" key={slot.starts_at}>{new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Khartoum' }).format(new Date(slot.starts_at))}</span>) : <p>{t('doctor.availability.noSlots')}</p>}</div>
            </section>
            <section className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-extrabold">{t('doctor.availability.exceptionsTitle')}</h2>
              <div className="mt-4 grid gap-3">{exceptions.length ? exceptions.map((item) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4" key={item.id}><div><p className="font-bold">{item.exception_date.slice(0, 10)}</p><p className="text-sm text-[var(--color-text-secondary)]">{t(`doctor.availability.types.${item.type}`)}{item.start_time ? ` · ${item.start_time.slice(0, 5)}–${item.end_time?.slice(0, 5)}` : ''}</p></div><div className="flex gap-2"><button className="rounded-full border border-[var(--color-primary)] px-3 py-1 text-sm font-bold text-[var(--color-primary)]" onClick={() => editException(item)}>{t('doctor.availability.edit')}</button><button className="rounded-full border border-red-200 px-3 py-1 text-sm font-bold text-red-700" disabled={busy === `delete-${item.id}`} onClick={() => removeException(item.id)}>{t('doctor.availability.remove')}</button></div></div>) : <p>{t('doctor.availability.noExceptions')}</p>}</div>
            </section>
          </div>
          <section className="mt-6 rounded-3xl border border-teal-100 bg-[var(--color-primary-surface)] p-5 shadow-sm sm:p-7">
            <h2 className="text-2xl font-extrabold">{t(editingId ? 'doctor.availability.editException' : 'doctor.availability.addException')}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="font-semibold">{t('doctor.availability.date')}<input className="direction-ltr mt-1 block w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2" min={new Date().toISOString().slice(0, 10)} onChange={(event) => setExceptionForm((current) => ({ ...current, exception_date: event.target.value }))} type="date" value={exceptionForm.exception_date} /></label>
              <label className="font-semibold">{t('doctor.availability.exceptionType')}<select className="mt-1 block w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2" onChange={(event) => setExceptionForm((current) => ({ ...current, type: event.target.value as ExceptionInput['type'], start_time: event.target.value === 'unavailable' ? null : current.start_time ?? '09:00', end_time: event.target.value === 'unavailable' ? null : current.end_time ?? '12:00' }))} value={exceptionForm.type}>{(['unavailable', 'modified', 'blocked'] as const).map((type) => <option key={type} value={type}>{t(`doctor.availability.types.${type}`)}</option>)}</select></label>
              {exceptionForm.type !== 'unavailable' && <><label className="font-semibold">{t('doctor.availability.start')}<input className="direction-ltr mt-1 block w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2" onChange={(event) => setExceptionForm((current) => ({ ...current, start_time: event.target.value }))} type="time" value={exceptionForm.start_time ?? ''} /></label><label className="font-semibold">{t('doctor.availability.end')}<input className="direction-ltr mt-1 block w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2" onChange={(event) => setExceptionForm((current) => ({ ...current, end_time: event.target.value }))} type="time" value={exceptionForm.end_time ?? ''} /></label></>}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white" disabled={busy === 'exception'} onClick={saveException}>{t(busy === 'exception' ? 'doctor.availability.saving' : 'doctor.availability.saveException')}</button>
              {editingId && <button className="rounded-full border border-[var(--color-primary)] px-6 py-3 font-bold text-[var(--color-primary)]" onClick={() => { setEditingId(null); setExceptionForm(emptyException(activeType)) }}>{t('doctor.availability.cancelEdit')}</button>}
            </div>
          </section>
        </>}
        <p aria-live="polite" className="mt-5 min-h-6 text-center font-semibold text-[var(--color-primary)]">{message ? t(message) : ''}</p>
      </div>
    </DoctorLayout>
  )
}
