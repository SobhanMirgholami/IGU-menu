import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/format'

export default function Cart({ cart, setCart }) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [orderId, setOrderId] = useState(null)

  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

  function changeQuantity(key, change) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.key === key ? { ...line, quantity: Math.min(line.quantity + change, 10) } : line
        )
        .filter((line) => line.quantity > 0)
    )
  }

  async function placeOrder() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.rpc('place_order', {
      p_items: cart.map((line) => ({
        menu_item_id: line.menu_item_id,
        quantity: line.quantity,
        option_ids: line.options.map((o) => o.id),
      })),
      p_note: note.trim() || null,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setOrderId(data)
      setCart([])
      setNote('')
    }
  }

  if (orderId) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm text-center">
        <p className="text-gray-600">Order placed!</p>
        <p className="text-4xl font-bold text-amber-800 my-2">#{orderId}</p>
        <p className="text-sm text-gray-500 mb-4">Show this number at the counter.</p>
        <button onClick={() => setOrderId(null)} className="text-amber-800 underline text-sm">
          New order
        </button>
      </div>
    )
  }

  if (cart.length === 0) {
    return <p className="text-gray-500 text-sm">Your cart is empty.</p>
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
      <h2 className="font-semibold text-amber-800">Your order</h2>

      {cart.map((line) => (
        <div key={line.key} className="flex items-center justify-between gap-2">
          <div>
            <p>{line.name.en}</p>
            {line.options.length > 0 && (
              <p className="text-xs text-gray-500">
                {line.options.map((o) => o.name.en).join(', ')}
              </p>
            )}
            <p className="text-xs text-gray-500">{formatPrice(line.unitPrice)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => changeQuantity(line.key, -1)} className="w-8 h-8 rounded-full bg-amber-100">−</button>
            <span className="w-6 text-center">{line.quantity}</span>
            <button onClick={() => changeQuantity(line.key, 1)} className="w-8 h-8 rounded-full bg-amber-100">+</button>
          </div>
        </div>
      ))}

      <textarea
        placeholder="Note (optional)"
        maxLength={200}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full border rounded-lg p-2 text-sm"
      />

      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span>{formatPrice(total)}</span>
      </div>

      <button
        onClick={placeOrder}
        disabled={loading}
        className="w-full bg-amber-700 text-white rounded-lg p-3 disabled:opacity-50"
      >
        {loading ? 'Placing order...' : 'Place order'}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}