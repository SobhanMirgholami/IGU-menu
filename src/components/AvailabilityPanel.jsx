import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AvailabilityPanel() {
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
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
          <span>{item.name.tr}</span>
          <button
            onClick={() => toggle(item)}
            className={`px-4 py-2 rounded-lg text-white ${
              item.is_available ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {item.is_available ? 'Available' : 'Sold out'}
          </button>
        </li>
      ))}
    </ul>
  )
}