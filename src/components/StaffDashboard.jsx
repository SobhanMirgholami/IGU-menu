import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatPrice, formatTime } from '../lib/format'
import Receipt from './Receipt'
import OrderingToggle from './OrderingToggle'

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

export default function StaffDashboard() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState(null)
  const [receiptOrder, setReceiptOrder] = useState(null)

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, is_paid, note, created_at, pickup_at, order_items(id, quantity, unit_price, item_name, order_item_options(id, name))')
      .in('status', ['pending', 'preparing', 'ready'])
      .order('pickup_at', { ascending: true, nullsFirst: false })
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

  useEffect(() => {
    if (!receiptOrder) return
    window.print()
    setReceiptOrder(null)
  }, [receiptOrder])

  async function changeStatus(orderId, status) {
    if (status === 'cancelled' && !confirm(`Cancel order #${orderId}?`)) return

    const { error } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_status: status,
    })

    if (error) alert(error.message)
  }

  async function markPaid(orderId) {
    const { error } = await supabase.rpc('mark_order_paid', { p_order_id: orderId })
    if (error) alert(error.message)
  }

  return (
    <div className="space-y-4">
      <OrderingToggle />

      <h2 className="text-xl font-semibold text-amber-800">
        Active orders ({orders.length})
      </h2>

      {error && <p className="text-red-600">{error}</p>}
      {orders.length === 0 && <p className="text-gray-500">No active orders.</p>}

      {orders.map((order) => {
        const next = NEXT_STEP[order.status]
        const needsPayment = next.status === 'completed' && !order.is_paid

        return (
          <div key={order.id} className="bg-white rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-2xl font-bold">#{order.id}</span>
                {order.pickup_at && (
                  <span className="ms-3 text-lg font-semibold text-amber-800">
                    🕒 {formatTime(order.pickup_at)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    order.is_paid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {order.is_paid ? 'Paid' : 'Unpaid'}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[order.status]}`}>
                  {order.status}
                </span>
              </div>
            </div>

            <ul className="text-sm">
              {order.order_items.map((item) => (
                <li key={item.id}>
                  {item.quantity} × {item.item_name.tr}
                  {item.order_item_options.length > 0 && (
                    <span className="block text-xs text-gray-500 ms-6">
                      {item.order_item_options.map((o) => o.name.tr).join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {order.note && (
              <p className="text-sm bg-amber-50 rounded p-2">Note: {order.note}</p>
            )}

            <div className="flex justify-between text-sm text-gray-500">
              <span>Ordered {formatTime(order.created_at)}</span>
              <span className="font-semibold text-gray-800">{formatPrice(order.total)}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {!order.is_paid && (
                <button
                  onClick={() => markPaid(order.id)}
                  className="px-3 py-2 rounded-lg border border-green-600 text-green-700"
                >
                  Mark paid
                </button>
              )}

              <button
                onClick={() => setReceiptOrder(order)}
                className="px-3 py-2 rounded-lg border border-gray-300"
              >
                Print
              </button>

              <button
                onClick={() => changeStatus(order.id, next.status)}
                disabled={needsPayment}
                title={needsPayment ? 'Mark as paid first' : ''}
                className="flex-1 bg-amber-700 text-white rounded-lg p-2 disabled:opacity-40"
              >
                {next.label}
              </button>

              {!order.is_paid && (
                <button
                  onClick={() => changeStatus(order.id, 'cancelled')}
                  className="px-3 py-2 rounded-lg border border-red-300 text-red-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )
      })}

      <Receipt order={receiptOrder} />
    </div>
  )
}