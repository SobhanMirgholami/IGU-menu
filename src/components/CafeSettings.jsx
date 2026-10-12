import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const SLOT_LENGTHS = [5, 10, 15, 20, 30, 60]

export default function CafeSettings() {
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

    if (error) setMessage({ type: 'error', text: error.message })
    else if (!data || data.length === 0) setMessage({ type: 'error', text: 'Not saved. You may not have permission.' })
    else setMessage({ type: 'success', text: 'Settings saved.' })
  }

  if (!form) return <p className="text-muted">Loading...</p>

  return (
    <form onSubmit={save} className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4 space-y-3">
      <h2 className="font-display font-bold text-lg">Café settings</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Opens at
          <input type="time" value={form.open_time} onChange={(e) => updateField('open_time', e.target.value)} className="w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted" />
        </label>
        <label className="text-sm">
          Closes at
          <input type="time" value={form.close_time} onChange={(e) => updateField('close_time', e.target.value)} className="w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted" />
        </label>
        <label className="text-sm">
          Slot length (minutes)
          <select value={form.slot_minutes} onChange={(e) => updateField('slot_minutes', e.target.value)} className="w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted">
            {SLOT_LENGTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Orders per slot
          <input type="number" min="1" max="200" value={form.max_orders_per_slot} onChange={(e) => updateField('max_orders_per_slot', e.target.value)} className="w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted" />
        </label>
        <label className="text-sm col-span-2">
          Minimum preparation time (minutes)
          <input type="number" min="0" max="120" value={form.min_lead_minutes} onChange={(e) => updateField('min_lead_minutes', e.target.value)} className="w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted" />
        </label>
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
          {message.text}
        </p>
      )}

      <button disabled={saving} className="w-full h-12 bg-brand text-white border-2 border-ink rounded-2xl font-bold shadow-hard-sm disabled:opacity-50">
        {saving ? 'Saving...' : 'Save settings'}
      </button>
    </form>
  )
}