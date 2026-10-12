import { useTranslation } from 'react-i18next'
import { GlobeIcon } from './icons'

const ORDER = ['tr', 'en', 'ar']
const LABELS = { tr: 'TR', en: 'EN', ar: 'عربي' }

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  function next() {
    const index = ORDER.indexOf(current)
    i18n.changeLanguage(ORDER[(index + 1) % ORDER.length])
  }

  return (
    <button
      onClick={next}
      aria-label={t('app.language')}
      className="h-11 px-3.5 rounded-full border-2 border-ink bg-white text-ink font-bold text-sm flex items-center gap-1.5"
    >
      <GlobeIcon size={18} />
      {LABELS[current]}
    </button>
  )
}