import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, ChevronIcon, GlobeIcon } from './icons'

const LANGUAGES = [
  { code: 'tr', short: 'TR', name: 'Türkçe' },
  { code: 'en', short: 'EN', name: 'English' },
  { code: 'ar', short: 'ع', name: 'العربية' },
]

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrapper = useRef(null)
  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0]

  useEffect(() => {
    if (!open) return

    function onPointerDown(event) {
      if (!wrapper.current?.contains(event.target)) setOpen(false)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(code) {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('app.language')}
        className="h-11 px-3 rounded-full border-2 border-ink bg-white text-ink font-bold text-sm flex items-center gap-1.5"
      >
        <GlobeIcon size={18} />
        {current.short}
        <ChevronIcon size={14} strokeWidth={2.6} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul className="absolute top-full end-0 mt-2 z-50 min-w-44 bg-surface text-fg border-2 border-line rounded-2xl shadow-hard p-1.5 flex flex-col gap-1">
          {LANGUAGES.map((lang) => {
            const active = lang.code === current.code
            return (
              <li key={lang.code}>
                <button
                  onClick={() => choose(lang.code)}
                  aria-pressed={active}
                  lang={lang.code}
                  className={`w-full h-11 px-3 rounded-xl flex items-center justify-between gap-3 font-semibold text-start hover:bg-chip ${
                    active ? 'bg-chip' : ''
                  }`}
                >
                  {lang.name}
                  {active && <CheckIcon size={18} strokeWidth={3} className="text-brand dark:text-pop" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}