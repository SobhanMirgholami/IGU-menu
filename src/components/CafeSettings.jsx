import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

const SLOT_LENGTHS = [5, 10, 15, 20, 30, 60]

const inputClass =
  'w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg focus:outline-none focus:border-brand dark:focus:border-pop'

export default function CafeSettings() {
  const { t } = useTranslation()
  const [form, setForm] = useState(null)
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('cafe_settings')
        .select('open_time, close_time, slot_minutes, max_orders_per_slot, min_lead_minutes')
        .eq('id', 1)
        .single()

      if (data) {
        setForm({
          ...data,
          open_time: data.open_time.slice(0, 5),
          close_time: data.close_time.slice(0, 5),
        })
      }
    }
    load()
  }, [])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setMessage(null)
  }

  async function save(e) {
    e.preventDefault()

    const [openHour, openMinute] = form.open_time.split(':').map(Number)
    if (!form.open_time || !form.close_time || form.open_time >= form.close_time) {
      return setMessage({ type: 'error', text: t('manager.settings.errors.order') })
    }
    if (openMinute % Number(form.slot_minutes) !== 0 || Number.isNaN(openHour)) {
      return setMessage({ type: 'error', text: t('manager.settings.errors.align', { minutes: form.slot_minutes }) })
    }

    setSaving(true)

    const { data, error } = await supabase
      .from('cafe_settings')
      .update({
        open_time: form.open_time,
        close_time: form.close_time,
        slot_minutes: Number(form.slot_minutes),
        max_orders_per_slot: Number(form.max_orders_per_slot),
        min_lead_minutes: Number(form.min_lead_minutes),
      })
      .eq('id', 1)
      .select()

    setSaving(false)

    if (error) setMessage({ type: 'error', text: error.code === '23514' ? t('manager.settings.errors.invalid') : error.message })
    else if (!data || data.length === 0) setMessage({ type: 'error', text: t('manager.errors.permission') })
    else setMessage({ type: 'success', text: t('manager.settings.saved') })
  }

  if (!form) return <p className="text-muted">{t('manager.settings.loading')}</p>

  return (
    <form
      onSubmit={save}
      className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4 flex flex-col gap-4 max-w-xl"
    >
      <h2 className="font-display font-extrabold text-xl">{t('manager.settings.title')}</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.settings.opens')}
          <input type="time" dir="ltr" value={form.open_time} onChange={(e) => updateField('open_time', e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.settings.closes')}
          <input type="time" dir="ltr" value={form.close_time} onChange={(e) => updateField('close_time', e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.settings.slot')}
          <select value={form.slot_minutes} onChange={(e) => updateField('slot_minutes', e.target.value)} className={inputClass}>
            {SLOT_LENGTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.settings.perSlot')}
          <input type="number" min="1" max="200" dir="ltr" value={form.max_orders_per_slot} onChange={(e) => updateField('max_orders_per_slot', e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold col-span-2">
          {t('manager.settings.lead')}
          <input type="number" min="0" max="120" dir="ltr" value={form.min_lead_minutes} onChange={(e) => updateField('min_lead_minutes', e.target.value)} className={inputClass} />
        </label>
      </div>

      {message && (
        <p
          role="status"
          className={`text-sm font-semibold ${
            message.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        disabled={saving}
        className="w-full h-12 bg-brand text-white border-2 border-ink rounded-2xl font-bold shadow-hard-sm disabled:opacity-50"
      >
        {saving ? t('manager.saving') : t('manager.settings.save')}
      </button>
    </form>
  )
}
