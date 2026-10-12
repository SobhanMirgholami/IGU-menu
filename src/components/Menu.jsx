import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/format'

export default function Menu({ onAdd }) {
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadMenu() {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, price, is_available')
        .order('sort_order')

      if (error) setError(error.message)
      else setItems(data)
    }
    loadMenu()
  }, [])

  return (
    <div>
      {error && <p className="text-red-600">Error: {error}</p>}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
            <div>
              <p>{item.name.en}</p>
              <p className="text-sm font-semibold text-amber-800">{formatPrice(item.price)}</p>
            </div>
            <button
              onClick={() => onAdd(item)}
              disabled={!item.is_available}
              className="bg-amber-700 text-white rounded-lg px-4 py-2 disabled:opacity-40"
            >
              {item.is_available ? 'Add' : 'Sold out'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}