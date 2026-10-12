import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { translateFromTurkish } from '../lib/translate'
import { GlobeIcon } from './icons'

export const inputClass =
  'w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted focus:outline-none focus:border-brand dark:focus:border-pop'

export const emptyNames = { tr: '', en: '', ar: '' }
export const namesComplete = (names) => ['tr', 'en', 'ar'].every((lang) => names[lang]?.trim())
export const cleanNames = (names) => ({ tr: names.tr.trim(), en: names.en.trim(), ar: names.ar.trim() })

// Turkish, English and Arabic name inputs with a "translate" button in between.
// Used for menu items, option groups and option choices.
export default function NameFields({ value, onChange }) {
  const { t } = useTranslation()
  const [translating, setTranslating] = useState(false)
  const [status, setStatus] = useState(null) // 'done' | 'failed'

  const setName = (lang, text) => onChange({ ...value, [lang]: text })

  async function translate() {
    setTranslating(true)
    setStatus(null)
    try {
      const { en, ar } = await translateFromTurkish(value.tr.trim())
      onChange({ ...value, en, ar })
      setStatus('done')
    } catch {
      setStatus('failed')
    } finally {
      setTranslating(false)
    }
  }

  return (
    <>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t('manager.nameTr')}
        <input lang="tr" dir="ltr" value={value.tr} onChange={(e) => setName('tr', e.target.value)} className={inputClass} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={translate}
          disabled={translating || !value.tr.trim()}
          className="h-10 px-4 rounded-full border-2 border-ink bg-pop text-ink font-bold text-sm shadow-hard-sm flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
        >
          <GlobeIcon size={16} strokeWidth={2.4} />
          {translating ? t('manager.translating') : t('manager.translate')}
        </button>
        {status === 'done' && <p className="text-sm font-semibold text-muted">{t('manager.translateHint')}</p>}
        {status === 'failed' && (
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">{t('manager.errors.translate')}</p>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t('manager.nameEn')}
        <input lang="en" dir="ltr" value={value.en} onChange={(e) => setName('en', e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t('manager.nameAr')}
        <input lang="ar" dir="rtl" value={value.ar} onChange={(e) => setName('ar', e.target.value)} className={inputClass} />
      </label>
    </>
  )
}
