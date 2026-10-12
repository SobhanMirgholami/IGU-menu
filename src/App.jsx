import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const formatPrice = (price) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price)

function App() {
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
    <div className="min-h-screen bg-amber-50 p-6">
      <h1 className="text-3xl font-bold text-amber-800 mb-6">IGU Café ☕</h1>

      {error && <p className="text-red-600">Error: {error}</p>}

      <ul className="space-y-3 max-w-md">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between bg-white rounded-lg p-4 shadow-sm">
            <span>{item.name.en}</span>
            <span className="font-semibold">{formatPrice(item.price)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App