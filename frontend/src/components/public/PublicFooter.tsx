import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { APPOINTMENT_SEARCH_ROUTE, buildLoginPath } from '../../utils/navigation'
import { BrandMark } from '../branding/BrandMark'

const groups = [
  {
    key: 'quick',
    links: [
      ['home', '/#home'],
      ['about', '/#about'],
      ['services', '/#services'],
      ['doctors', '/register/doctor'],
      ['contact', '/#contact'],
    ],
  },
  {
    key: 'services',
    links: [
      ['clinic', buildLoginPath(APPOINTMENT_SEARCH_ROUTE)],
      ['homeVisit', buildLoginPath('/patient/home-visits')],
    ],
  },
  {
    key: 'help',
    links: [
      ['login', '/login'],
      ['patientRegistration', '/register/patient'],
      ['doctorRegistration', '/register/doctor'],
    ],
  },
] as const

/** Public footer. Groups contain only destinations that already exist in the app. */
export function PublicFooter() {
  const { t } = useTranslation()

  return (
    <footer className="relative overflow-hidden border-t border-teal-100 bg-[#f7fffd] text-slate-600">
      <span aria-hidden="true" className="absolute -bottom-20 end-4 size-64 rounded-full border border-teal-100 opacity-70" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.2fr_2fr] lg:px-10">
        <div className="min-w-0">
          <Link
            aria-label={t('publicHome.header.logoLabel')}
            className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            to="/"
          >
            <BrandMark variant="footer" />
            <span className="text-lg font-extrabold text-slate-900">
              MedAccess
              <br />
              <small className="font-bold text-[var(--color-primary)]">Sudan</small>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{t('publicHome.footer.description')}</p>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-8 sm:grid-cols-3">
          {groups.map((group) => (
            <div className="min-w-0" key={group.key}>
              <h2 className="break-words font-extrabold text-slate-900">
                {t(`publicHome.footer.groups.${group.key}.title`)}
              </h2>
              <ul className="mt-4 min-w-0 space-y-3 text-sm">
                {group.links.map(([item, to]) => (
                  <li className="min-w-0" key={item}>
                    <Link
                      className="inline-block max-w-full break-words text-start transition hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                      to={to}
                    >
                      {t(`publicHome.footer.groups.${group.key}.${item}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="relative border-t border-teal-100 px-5 py-5 text-center text-xs text-slate-500">
        {t('publicHome.footer.copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  )
}
