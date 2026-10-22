import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Reveal } from './Reveal'

const questionKeys = ['what', 'doctor', 'homeVisit', 'laboratory', 'homeCollection', 'appointments', 'support'] as const

export function PublicFaqSection() {
  const { t } = useTranslation()
  const [openQuestion, setOpenQuestion] = useState<(typeof questionKeys)[number] | null>('what')

  return (
    <section className="bg-[#f0fdfa] py-16 sm:py-20" id="faq">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600">{t('publicHome.faq.eyebrow')}</p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('publicHome.faq.title')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">{t('publicHome.faq.description')}</p>
        </Reveal>

        <Reveal className="mt-9 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_40px_rgb(15_118_110/0.08)]" delay={80}>
          {questionKeys.map((key, index) => {
            const expanded = openQuestion === key
            const answerId = `public-faq-${key}`
            return (
              <div className={index ? 'border-t border-slate-200' : ''} key={key}>
                <button
                  aria-controls={answerId}
                  aria-expanded={expanded}
                  className="flex min-h-16 w-full items-center gap-4 px-5 py-4 text-start text-base font-bold text-slate-900 outline-none transition-colors hover:bg-teal-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 sm:px-7"
                  onClick={() => setOpenQuestion(expanded ? null : key)}
                  type="button"
                >
                  <span className="flex-1">{t(`publicHome.faq.items.${key}.question`)}</span>
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-50 text-xl text-teal-700">{expanded ? '−' : '+'}</span>
                </button>
                {expanded && <div className="px-5 pb-5 pe-14 text-sm leading-7 text-slate-600 sm:px-7 sm:pe-18" id={answerId}>{t(`publicHome.faq.items.${key}.answer`)}</div>}
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
