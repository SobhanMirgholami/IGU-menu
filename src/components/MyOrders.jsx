import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, formatTime } from '../lib/format'

const STATUS_STYLE = {
  pending: 'bg-pop text-ink',
  preparing: 'bg-brand-soft text-ink',
  ready: 'bg-mint text-ink',
  cancelled: 'bg-coral-soft text-ink',
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
    <section className="flex flex-col gap-3">
      <h2 className="font-display font-extrabold text-xl">{t('myOrders.title')}</h2>
      {orders.map((order) => {
        const ready = order.status === 'ready'
        return (
          <div
            key={order.id}
            className={`flex justify-between items-center gap-3 border-2 rounded-[20px] p-4 ${
              ready
                ? 'bg-mint-soft text-ink border-ink shadow-hard dark:bg-surface dark:text-fg dark:border-mint'
                : 'bg-surface text-fg border-line shadow-hard-sm'
            }`}
          >
            <div>
              <p className="font-display font-extrabold text-2xl">#{order.id}</p>
              <p className={`text-sm ${ready ? 'opacity-80' : 'text-muted'}`}>
                {formatPrice(order.total)}
                {order.pickup_at && ` · ${t('myOrders.pickup', { time: formatTime(order.pickup_at) })}`}
              </p>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${STATUS_STYLE[order.status]}`}>
              {t(`myOrders.status.${order.status}`)}
            </span>
          </div>
        )
      })}
    </section>
  )
}
