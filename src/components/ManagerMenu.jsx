import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/format'
import { pick } from '../lib/localize'
import NameFields, { inputClass, emptyNames, namesComplete, cleanNames } from './NameFields'
import { CheckIcon } from './icons'

// Same lists as the database checks in 09_item_options.sql
const ALLERGENS = ['gluten', 'milk', 'nuts', 'peanuts', 'egg', 'soy', 'sesame', 'fish']
const DIETS = ['vegan', 'vegetarian']

const EMPTY_FORM = { names: emptyNames, price: '', category_id: '', allergens: [], diet_tags: [] }

function TagPicker({ label, tags, selected, onChange, labelKey }) {
  const { t } = useTranslation()

  const toggle = (tag) =>
    onChange(selected.includes(tag) ? selected.filter((x) => x !== tag) : [...selected, tag])

  return (
    <fieldset className="flex flex-col gap-2 min-w-0">
      <legend className="text-sm font-semibold mb-1">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const on = selected.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={on}
              className={`h-9 px-3 rounded-full border-2 text-sm font-bold flex items-center gap-1.5 ${
                on ? 'bg-pop text-ink border-ink' : 'bg-surface text-fg border-line'
              }`}
            >
              {on && <CheckIcon size={14} strokeWidth={3} />}
              {t(`${labelKey}.${tag}`)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
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

  async function load() {
    const [itemsResult, categoriesResult] = await Promise.all([
      supabase
        .from('menu_items')
        .select('id, name, price, category_id, allergens, diet_tags, is_available, is_archived, sort_order')
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
      names: { tr: item.name.tr, en: item.name.en, ar: item.name.ar },
      price: String(item.price),
      category_id: String(item.category_id),
      allergens: item.allergens ?? [],
      diet_tags: item.diet_tags ?? [],
    })
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function save(e) {
    e.preventDefault()
    setError(null)

    const price = Number(form.price)

    if (!namesComplete(form.names)) return setError(t('manager.errors.names'))
    if (form.price === '' || !Number.isFinite(price) || price < 0) return setError(t('manager.errors.price'))
    if (!form.category_id) return setError(t('manager.errors.category'))

    const data = {
      name: cleanNames(form.names),
      price,
      category_id: Number(form.category_id),
      allergens: form.allergens,
      diet_tags: form.diet_tags,
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

    if (error) setError(error.message)
    else if (!saved || saved.length === 0) setError(t('manager.errors.permission'))
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

        <NameFields value={form.names} onChange={(names) => updateField('names', names)} />

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

        <TagPicker
          label={t('manager.allergensLabel')}
          tags={ALLERGENS}
          selected={form.allergens}
          onChange={(tags) => updateField('allergens', tags)}
          labelKey="allergens"
        />
        <TagPicker
          label={t('manager.dietsLabel')}
          tags={DIETS}
          selected={form.diet_tags}
          onChange={(tags) => updateField('diet_tags', tags)}
          labelKey="diets"
        />

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

            {(item.allergens?.length > 0 || item.diet_tags?.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {item.diet_tags?.map((tag) => (
                  <span key={tag} className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-chip">
                    {t(`diets.${tag}`)}
                  </span>
                ))}
                {item.allergens?.map((tag) => (
                  <span key={tag} className="text-xs font-semibold px-2 py-0.5 rounded-lg border border-line">
                    {t(`allergens.${tag}`)}
                  </span>
                ))}
              </div>
            )}

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
