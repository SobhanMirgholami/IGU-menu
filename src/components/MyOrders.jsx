import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, formatTime } from '../lib/format'

const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function MyOrders() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState([])
  const previousStatus = useRef({})

  async function loadOrders() {
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, created_at, pickup_at')
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
      <h2 className="font-semibold text-amber-800">{t('myOrders.title')}</h2>
      {orders.map((order) => (
        <div
          key={order.id}
          className={`flex justify-between items-center bg-white rounded-lg p-4 shadow-sm ${
            order.status === 'ready' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <div>
            <p className="text-xl font-bold">#{order.id}</p>
            <p className="text-sm text-gray-500">
              {formatPrice(order.total)}
              {order.pickup_at && ` · ${t('myOrders.pickup', { time: formatTime(order.pickup_at) })}`}
            </p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full ${STATUS_STYLE[order.status]}`}>
            {t(`myOrders.status.${order.status}`)}
          </span>
        </div>
      ))}
    </div>
  )
}