import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { clinicDoctorPath, clinicResultsPath } from '../../utils/clinicVisitNav'
import { BookingFlowFrame } from './BookingFlowFrame'

export type ClinicVisitStep = 'search' | 'doctors' | 'time' | 'review'

const order: ClinicVisitStep[] = ['search', 'doctors', 'time', 'review']

export function ClinicVisitFrame({ step, children }: { step: ClinicVisitStep; children: ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentIndex = order.indexOf(step)

  return (
    <BookingFlowFrame
      ariaLabel={t('patient.findDoctor.progress')}
      currentIndex={currentIndex}
      description={t('patient.findDoctor.description')}
      eyebrow={t('patient.findDoctor.eyebrow')}
      steps={[
        { id: 'search', label: t('patient.findDoctor.steps.search'), onSelect: currentIndex > 0 ? () => navigate('/patient/doctors/search') : undefined },
        { id: 'doctors', label: t('patient.findDoctor.steps.doctors'), onSelect: currentIndex > 1 ? () => navigate(clinicResultsPath()) : undefined },
        { id: 'time', label: t('patient.findDoctor.steps.time'), onSelect: currentIndex > 2 ? () => navigate(clinicDoctorPath()) : undefined },
        { id: 'review', label: t('patient.findDoctor.steps.review') },
      ]}
      title={t('patient.findDoctor.title')}
    >
      {children}
    </BookingFlowFrame>
  )
}
