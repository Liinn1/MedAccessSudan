import { useTranslation } from 'react-i18next'
import manageAvailabilityImage from '../../assets/doctor-tips/manage-availability.jpg'
import planAppointmentsImage from '../../assets/doctor-tips/plan-appointments.jpg'
import updateProfileImage from '../../assets/doctor-tips/update-profile.jpg'
import { DashboardFeatureCarousel } from '../dashboard/DashboardFeatureCarousel'

const PRACTICE_TIPS = [
  { id: 'availability', image: manageAvailabilityImage, route: '/doctor/availability', position: 'object-center' },
  { id: 'profile', image: updateProfileImage, route: '/doctor/profile', position: 'object-[center_28%]' },
  { id: 'appointments', image: planAppointmentsImage, route: '/doctor/appointments', position: 'object-center' },
] as const

export function DoctorPracticeTipsCarousel() {
  const { i18n, t } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  return (
    <DashboardFeatureCarousel
      carouselDescription={t('doctor.dashboard.tips.carousel')}
      carouselLabel={t('doctor.dashboard.tips.carouselLabel')}
      isRtl={isRtl}
      nextLabel={t('doctor.dashboard.tips.next')}
      paginationLabel={t('doctor.dashboard.tips.pagination')}
      previousLabel={t('doctor.dashboard.tips.previous')}
      slideLabel={(number) => t('doctor.dashboard.tips.goToSlide', { number })}
      slides={PRACTICE_TIPS.map((tip) => ({
        id: tip.id,
        image: tip.image,
        imagePosition: tip.position,
        label: t(`doctor.dashboard.tips.slides.${tip.id}.label`),
        title: t(`doctor.dashboard.tips.slides.${tip.id}.title`),
        description: t(`doctor.dashboard.tips.slides.${tip.id}.description`),
        cta: t(`doctor.dashboard.tips.slides.${tip.id}.cta`),
        to: tip.route,
      }))}
      title={t('doctor.dashboard.tips.title')}
    />
  )
}
