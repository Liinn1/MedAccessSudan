import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { ContactSection } from '../../components/public/ContactSection'
import { FeaturedDoctorsSection } from '../../components/public/FeaturedDoctorsSection'
import { InformationDialog } from '../../components/feedback/InformationDialog'
import { PublicHeroCarousel } from '../../components/public/PublicHeroCarousel'
import { PublicFaqSection } from '../../components/public/PublicFaqSection'
import {
  AboutSection,
  AppPromoSection,
  ServicesSection,
} from '../../components/public/PublicHomeSections'
import { PublicLayout } from '../../layouts/PublicLayout'

/**
 * Public marketing homepage. It only composes section components so routing,
 * authentication, and booking stay in their existing dedicated pages.
 */
export function PublicHomePage() {
  const { t } = useTranslation()
  const location = useLocation()
  const [comingSoon, setComingSoon] = useState('')

  useEffect(() => {
    if (!location.hash) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash])

  return (
    <PublicLayout>
      <div className="overflow-x-clip bg-white">
        <PublicHeroCarousel />
        <ServicesSection onComingSoon={setComingSoon} />
        <AboutSection />
        <FeaturedDoctorsSection />
        <AppPromoSection />
        <PublicFaqSection />
        <ContactSection />

        <InformationDialog
          closeLabel={t('publicHome.footer.comingSoonClose')}
          description={t('publicHome.footer.comingSoonDescription', { feature: comingSoon })}
          onClose={() => setComingSoon('')}
          open={Boolean(comingSoon)}
          title={t('publicHome.comingSoon')}
        />
      </div>
    </PublicLayout>
  )
}
