import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BrandMark } from '../branding/BrandMark'
import { LanguageToggle } from '../LanguageToggle'
import { APPOINTMENT_SEARCH_ROUTE, buildLoginPath } from '../../utils/navigation'

export function PublicFooter() {
  const { t } = useTranslation()
  const groups = ['medaccess', 'patients', 'providers', 'help'] as const
  const destinations = {
    medaccess: ['/#about', '/#about', '/#about', '/#about'],
    patients: ['/#featured-doctors', buildLoginPath(APPOINTMENT_SEARCH_ROUTE), '/#services', '/#services'],
    providers: ['/#about', '/login', '/#about', '/#about'],
    help: ['/#about', '/#about', '/#about', '/#about'],
  } as const
  return <footer className="bg-slate-950 text-slate-300"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.2fr_3fr] lg:px-10"><div className="min-w-0"><Link aria-label={t('publicHome.header.logoLabel')} className="inline-block rounded-2xl bg-white p-2" to="/"><BrandMark compact /></Link><p className="mt-4 max-w-sm text-sm leading-relaxed">{t('publicHome.footer.description')}</p><div className="mt-5"><LanguageToggle /></div></div><div className="grid min-w-0 grid-cols-2 gap-8 md:grid-cols-4">{groups.map((group)=><div className="min-w-0" key={group}><h2 className="break-words font-bold text-white">{t(`publicHome.footer.groups.${group}.title`)}</h2><ul className="mt-4 min-w-0 space-y-3 text-sm">{(['one','two','three','four'] as const).map((item, index)=><li className="min-w-0" key={item}><Link className="inline-block max-w-full break-words hover:text-teal-300 focus-visible:outline-2 focus-visible:outline-teal-300" to={destinations[group][index]}>{t(`publicHome.footer.groups.${group}.${item}`)}</Link></li>)}</ul></div>)}</div></div><div className="border-t border-white/10 px-5 py-5 text-center text-sm">{t('publicHome.footer.copyright',{year:new Date().getFullYear()})}</div></footer>
}
