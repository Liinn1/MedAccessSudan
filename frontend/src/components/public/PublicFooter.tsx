import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useSignUpModal } from '../../contexts/signUpModal'
import { APPOINTMENT_SEARCH_ROUTE, buildLoginPath } from '../../utils/navigation'
import { BrandMark } from '../branding/BrandMark'
import { InformationDialog } from '../feedback/InformationDialog'
import { LanguageToggle } from '../LanguageToggle'

type Group = 'medaccess' | 'patients' | 'providers' | 'help'
type Item = 'one' | 'two' | 'three' | 'four'
type FooterAction = { kind: 'link'; to: string } | { kind: 'signup' } | { kind: 'soon' }

const footerActions: Record<Group, Record<Item, FooterAction>> = {
  medaccess: { one: { kind: 'link', to: '/#about' }, two: { kind: 'soon' }, three: { kind: 'soon' }, four: { kind: 'soon' } },
  patients: { one: { kind: 'link', to: '/#featured-doctors' }, two: { kind: 'link', to: buildLoginPath(APPOINTMENT_SEARCH_ROUTE) }, three: { kind: 'soon' }, four: { kind: 'soon' } },
  providers: { one: { kind: 'signup' }, two: { kind: 'soon' }, three: { kind: 'soon' }, four: { kind: 'soon' } },
  help: { one: { kind: 'soon' }, two: { kind: 'soon' }, three: { kind: 'soon' }, four: { kind: 'soon' } },
}

export function PublicFooter() {
  const { t } = useTranslation()
  const openSignUp = useSignUpModal()
  const [comingSoonLabel, setComingSoonLabel] = useState('')
  const closeComingSoon = useCallback(() => setComingSoonLabel(''), [])
  const groups = Object.keys(footerActions) as Group[]

  return <>
    <footer className="bg-slate-950 text-slate-300"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.2fr_3fr] lg:px-10"><div className="min-w-0"><Link aria-label={t('publicHome.header.logoLabel')} className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300" to="/"><BrandMark variant="footer" /><span className="text-lg font-extrabold text-white">MedAccess</span></Link><p className="mt-4 max-w-sm text-sm leading-relaxed">{t('publicHome.footer.description')}</p><div className="mt-5"><LanguageToggle /></div></div><div className="grid min-w-0 grid-cols-2 gap-8 md:grid-cols-4">{groups.map((group) => <div className="min-w-0" key={group}><h2 className="break-words font-bold text-white">{t(`publicHome.footer.groups.${group}.title`)}</h2><ul className="mt-4 min-w-0 space-y-3 text-sm">{(Object.keys(footerActions[group]) as Item[]).map((item) => {
        const action = footerActions[group][item]
        const label = t(`publicHome.footer.groups.${group}.${item}`)
        const classes = 'inline-block max-w-full break-words text-start transition hover:text-teal-300 focus-visible:outline-2 focus-visible:outline-teal-300'
        return <li className="min-w-0" key={item}>{action.kind === 'link' ? <Link className={classes} to={action.to}>{label}</Link> : <button aria-haspopup="dialog" className={classes} onClick={action.kind === 'signup' ? openSignUp : () => setComingSoonLabel(label)} type="button">{label}{action.kind === 'soon' && <span className="ms-1 text-xs text-slate-400">({t('publicHome.comingSoon')})</span>}</button>}</li>
      })}</ul></div>)}</div></div><div className="border-t border-white/10 px-5 py-5 text-center text-sm">{t('publicHome.footer.copyright', { year: new Date().getFullYear() })}</div></footer>
    <InformationDialog closeLabel={t('publicHome.footer.comingSoonClose')} description={t('publicHome.footer.comingSoonDescription', { feature: comingSoonLabel })} onClose={closeComingSoon} open={Boolean(comingSoonLabel)} title={t('publicHome.comingSoon')} />
  </>
}
