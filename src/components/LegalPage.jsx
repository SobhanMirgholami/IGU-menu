import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LEGAL_CONTENT } from '../legal/content'
import { LEGAL } from '../lib/legal'

const PAGES = ['terms', 'privacy']

const readHash = () => {
  const page = window.location.hash.replace('#', '')
  return PAGES.includes(page) ? page : null
}

// Shows the Terms or the Privacy Notice when the address ends in #terms or #privacy
export default function LegalPage() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(readHash)

  function close() {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setPage(null)
  }

  useEffect(() => {
    const onHash = () => setPage(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!page) return
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [page])

  if (!page) return null

  const content = LEGAL_CONTENT[i18n.resolvedLanguage] ?? LEGAL_CONTENT.tr
  const doc = content[page]
  const contact = LEGAL.contactEmail || t('legal.contactCounter')
  const fill = (text) => text.replaceAll('{controller}', LEGAL.controller).replaceAll('{contact}', contact)

  return (
    <div className="fixed inset-0 z-50 bg-page text-fg overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="legal-title">
      <div className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 sticky top-0 bg-page py-2">
          <div className="flex gap-2 min-w-0">
            {PAGES.map((p) => (
              <a
                key={p}
                href={`#${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={`h-10 px-3 rounded-full border-2 font-bold text-sm flex items-center whitespace-nowrap ${
                  p === page
                    ? 'bg-ink text-white border-ink dark:bg-pop dark:text-ink dark:border-pop'
                    : 'bg-surface text-fg border-line'
                }`}
              >
                {t(`legal.${p}`)}
              </a>
            ))}
          </div>
          <button
            onClick={close}
            aria-label={t('legal.close')}
            className="w-10 h-10 shrink-0 rounded-full border-2 border-ink bg-pop text-ink font-bold shadow-hard-sm flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <header>
          <h1 id="legal-title" className="font-display font-extrabold text-3xl">
            {doc.title}
          </h1>
          <p className="text-sm text-muted mt-1">{content.updated}</p>
        </header>

        {doc.sections.map((section) => (
          <section key={section.h} className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-lg">{section.h}</h2>
            {section.p.map((text, i) => (
              <p key={i} className="leading-relaxed">
                {fill(text)}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
