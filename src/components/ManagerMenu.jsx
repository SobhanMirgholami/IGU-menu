import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/format'
import { pick } from '../lib/localize'
import { GlobeIcon } from './icons'

const EMPTY_FORM = { tr: '', en: '', ar: '', price: '', category_id: '' }

const inputClass =
  'w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted focus:outline-none focus:border-brand dark:focus:border-pop'

async function translateText(text, target) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=tr|${target}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Translation failed')

  const json = await response.json()
  const result = json?.responseData?.translatedText
  if (json?.responseStatus !== 200 || !result || result.includes('MYMEMORY WARNING')) {
    throw new Error('Translation failed')
  }
  return result
}

export default function ManagerMenu() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translated, setTranslated] = useState(false)

  async function load() {
    const [itemsResult, categoriesResult] = await Promise.all([
      supabase
        .from('menu_items')
        .select('id, name, price, category_id, is_available, is_archived, sort_order')
        .order('category_id')
        .order('sort_order'),
      supabase.from('categories').select('id, name').order('sort_order'),
    ])

    if (itemsResult.error) setError(itemsResult.error.message)
    else setItems(itemsResult.data)

    if (!categoriesResult.error) setCategories(categoriesResult.data)
  }

  useEffect(() => {
    load()
  }, [])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({
      tr: item.name.tr,
      en: item.name.en,
      ar: item.name.ar,
      price: String(item.price),
      category_id: String(item.category_id),
    })
    setError(null)
    setTranslated(false)
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setTranslated(false)
  }

  async function autoTranslate() {
    const source = form.tr.trim()
    if (!source) return

    setTranslating(true)
    setError(null)

    try {
      const [en, ar] = await Promise.all([translateText(source, 'en'), translateText(source, 'ar')])
      setForm((prev) => ({ ...prev, en, ar }))
      setTranslated(true)
    } catch {
      setError(t('manager.errors.translate'))
    } finally {
      setTranslating(false)
    }
  }

  async function save(e) {
    e.preventDefault()
    setError(null)

    const price = Number(form.price)

    if (!form.tr.trim() || !form.en.trim() || !form.ar.trim()) {
      return setError(t('manager.errors.names'))
    }
    if (form.price === '' || !Number.isFinite(price) || price < 0) {
      return setError(t('manager.errors.price'))
    }
    if (!form.category_id) {
      return setError(t('manager.errors.category'))
    }

    const data = {
      name: { tr: form.tr.trim(), en: form.en.trim(), ar: form.ar.trim() },
      price,
      category_id: Number(form.category_id),
    }

    setSaving(true)

    const { data: saved, error } = editingId
      ? await supabase.from('menu_items').update(data).eq('id', editingId).select()
      : await supabase.from('menu_items').insert(data).select()

    setSaving(false)

    if (error) {
      setError(error.message)
    } else if (!saved || saved.length === 0) {
      setError(t('manager.errors.permission'))
    } else {
      resetForm()
      load()
    }
  }

  async function toggle(item, field) {
    const { data: saved, error } = await supabase
      .from('menu_items')
      .update({ [field]: !item[field] })
      .eq('id', item.id)
      .select()

    if (error) alert(error.message)
    else if (!saved || saved.length === 0) alert(t('manager.errors.permission'))
    else load()
  }

  const categoryName = (id) => pick(categories.find((c) => c.id === id)?.name, lang)

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={save}
        className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4 flex flex-col gap-3"
      >
        <h2 className="font-display font-extrabold text-xl">
          {editingId ? t('manager.editItem', { id: editingId }) : t('manager.addItem')}
        </h2>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.nameTr')}
          <input lang="tr" dir="ltr" value={form.tr} onChange={(e) => updateField('tr', e.target.value)} className={inputClass} />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={autoTranslate}
            disabled={translating || !form.tr.trim()}
            className="h-10 px-4 rounded-full border-2 border-ink bg-pop text-ink font-bold text-sm shadow-hard-sm flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            <GlobeIcon size={16} strokeWidth={2.4} />
            {translating ? t('manager.translating') : t('manager.translate')}
          </button>
          {translated && <p className="text-sm font-semibold text-muted">{t('manager.translateHint')}</p>}
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.nameEn')}
          <input lang="en" dir="ltr" value={form.en} onChange={(e) => updateField('en', e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.nameAr')}
          <input lang="ar" dir="rtl" value={form.ar} onChange={(e) => updateField('ar', e.target.value)} className={inputClass} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t('manager.price')}
            <input
              type="number"
              step="0.01"
              min="0"
              dir="ltr"
              value={form.price}
              onChange={(e) => updateField('price', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t('manager.category')}
            <select
              value={form.category_id}
              onChange={(e) => updateField('category_id', e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {pick(c.name, lang)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            disabled={saving}
            className="grow h-12 bg-brand text-white border-2 border-ink rounded-2xl font-bold shadow-hard-sm disabled:opacity-50"
          >
            {saving ? t('manager.saving') : editingId ? t('manager.save') : t('manager.add')}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="h-12 px-4 rounded-2xl border-2 border-line bg-surface font-bold"
            >
              {t('manager.cancel')}
            </button>
          )}
        </div>
      </form>

      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`bg-surface border-2 border-line rounded-[20px] shadow-hard-sm p-4 flex flex-col gap-3 ${
              item.is_archived ? 'opacity-50' : ''
            }`}
          >
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display font-bold text-lg">{pick(item.name, lang)}</p>
                <p className="text-xs text-muted">
                  {categoryName(item.category_id)} · {item.name.tr} · {item.name.en} · <span lang="ar">{item.name.ar}</span>
                </p>
              </div>
              <p className="font-display font-extrabold text-brand dark:text-pop shrink-0">{formatPrice(item.price)}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <button
                onClick={() => startEdit(item)}
                className="h-10 px-4 rounded-full border-2 border-line bg-surface font-bold"
              >
                {t('manager.edit')}
              </button>
              <button
                onClick={() => toggle(item, 'is_available')}
                aria-pressed={!item.is_available}
                className={`h-10 px-4 rounded-full border-2 border-ink font-bold text-ink ${
                  item.is_available ? 'bg-mint' : 'bg-coral'
                }`}
              >
                {item.is_available ? t('manager.available') : t('manager.soldOut')}
              </button>
              <button
                onClick={() => toggle(item, 'is_archived')}
                className="h-10 px-4 rounded-full border-2 border-line bg-surface font-bold"
              >
                {item.is_archived ? t('manager.restore') : t('manager.archive')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
