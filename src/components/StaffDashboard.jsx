import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/format'

const NEXT_STEP = {
  pending: { status: 'preparing', label: 'Start preparing' },
  preparing: { status: 'ready', label: 'Ready' },
  ready: { status: 'completed', label: 'Picked up' },
}

const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
}

const formatTime = (date) =>
  new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

export default function StaffDashboard() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState(null)

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, note, created_at, order_items(id, quantity, item_name)')
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at')

    if (error) setError(error.message)
    else setOrders(data)
  }

  useEffect(() => {
    loadOrders()

    const channel = supabase
      .channel('staff-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function changeStatus(orderId, status) {
    if (status === 'cancelled' && !confirm(`Cancel order #${orderId}?`)) return

    const { error } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_status: status,
    })

    if (error) alert(error.message)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-amber-800">
        Active orders ({orders.length})
      </h2>

      {error && <p className="text-red-600">{error}</p>}
      {orders.length === 0 && <p className="text-gray-500">No active orders.</p>}

      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">#{order.id}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[order.status]}`}>
              {order.status}
            </span>
          </div>

          <ul className="text-sm">
            {order.order_items.map((item) => (
              <li key={item.id}>
                {item.quantity} × {item.item_name.tr}
              </li>
            ))}
          </ul>

          {order.note && (
            <p className="text-sm bg-amber-50 rounded p-2">Note: {order.note}</p>
          )}

          <div className="flex justify-between text-sm text-gray-500">
            <span>{formatTime(order.created_at)}</span>
            <span className="font-semibold text-gray-800">{formatPrice(order.total)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => changeStatus(order.id, NEXT_STEP[order.status].status)}
              className="flex-1 bg-amber-700 text-white rounded-lg p-2"
            >
              {NEXT_STEP[order.status].label}
            </button>
            <button
              onClick={() => changeStatus(order.id, 'cancelled')}
              className="px-3 rounded-lg border border-red-300 text-red-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}