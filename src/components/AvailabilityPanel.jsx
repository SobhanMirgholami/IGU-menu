import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { pick } from '../lib/localize'

export default function AvailabilityPanel() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const [items, setItems] = useState([])

  async function load() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, is_available')
      .eq('is_archived', false)
      .order('sort_order')

    if (!error) setItems(data)
  }

  useEffect(() => {
    load()
  }, [])

  async function toggle(item) {
    const { error } = await supabase.rpc('set_item_availability', {
      p_item_id: item.id,
      p_available: !item.is_available,
    })

    if (error) alert(error.message)
    else load()
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex justify-between items-center gap-3 bg-surface border-2 border-line rounded-[20px] shadow-hard-sm p-3 ps-4"
        >
          <span className="font-bold">{pick(item.name, lang)}</span>
          <button
            onClick={() => toggle(item)}
            aria-pressed={!item.is_available}
            className={`h-11 px-4 rounded-full border-2 border-ink font-bold text-ink ${
              item.is_available ? 'bg-mint' : 'bg-coral'
            }`}
          >
            {item.is_available ? t('staff.available') : t('staff.soldOut')}
          </button>
        </li>
      ))}
    </ul>
  )
}