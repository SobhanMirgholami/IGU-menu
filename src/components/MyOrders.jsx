import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/format'

const STATUS = {
  pending: { label: 'Received', style: 'bg-yellow-100 text-yellow-800' },
  preparing: { label: 'Being prepared', style: 'bg-blue-100 text-blue-800' },
  ready: { label: 'Ready for pickup!', style: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', style: 'bg-red-100 text-red-800' },
}

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const previousStatus = useRef({})

  async function loadOrders() {
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, created_at')
      .neq('status', 'completed')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (error) return

    data.forEach((order) => {
      const before = previousStatus.current[order.id]
      if (order.status === 'ready' && before && before !== 'ready') {
        navigator.vibrate?.([200, 100, 200])
      }
    })

    previousStatus.current = Object.fromEntries(data.map((o) => [o.id, o.status]))
    setOrders(data)
  }

  useEffect(() => {
    loadOrders()

    const channel = supabase
      .channel('my-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  if (orders.length === 0) return null

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-amber-800">My orders</h2>
      {orders.map((order) => (
        <div
          key={order.id}
          className={`flex justify-between items-center bg-white rounded-lg p-4 shadow-sm ${
            order.status === 'ready' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <div>
            <p className="text-xl font-bold">#{order.id}</p>
            <p className="text-sm text-gray-500">{formatPrice(order.total)}</p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full ${STATUS[order.status].style}`}>
            {STATUS[order.status].label}
          </span>
        </div>
      ))}
    </div>
  )
}