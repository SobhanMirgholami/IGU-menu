import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, formatTime } from '../lib/format'
import { CheckIcon, ClockIcon, CupIcon } from './icons'

const STATUS_STYLE = {
  pending: 'bg-pop text-ink',
  preparing: 'bg-brand-soft text-ink',
  ready: 'bg-mint text-ink',
  cancelled: 'bg-coral-soft text-ink',
}

const STEPS = ['received', 'preparing', 'ready']

const STEP_INDEX = { pending: 0, preparing: 1, ready: 2 }

function Progress({ status }) {
  const { t } = useTranslation()
  const current = STEP_INDEX[status] ?? 0

  return (
    <ol className="flex items-start">
      {STEPS.map((step, index) => {
        const done = index < current || status === 'ready'
        const active = index === current
        const isLast = index === STEPS.length - 1

        return (
          <li key={step} className={`flex items-start ${isLast ? '' : 'grow'}`}>
            <div className="flex flex-col items-center gap-1.5 w-20 shrink-0">
              <span
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${
                  isLast && status === 'ready'
                    ? 'bg-pop text-ink border-ink'
                    : done
                    ? 'bg-mint text-ink border-ink'
                    : active
                    ? 'bg-pop text-ink border-ink'
                    : 'bg-chip text-muted border-soft-line'
                }`}
              >
                {isLast && status === 'ready' ? (
                  <CupIcon size={18} strokeWidth={2.4} />
                ) : done ? (
                  <CheckIcon size={16} strokeWidth={3} />
                ) : (
                  <span className="text-xs font-extrabold">{index + 1}</span>
                )}
              </span>
              <span className={`text-xs text-center ${active || done ? 'font-bold' : 'text-muted font-semibold'}`}>
                {t(`myOrders.steps.${step}`)}
              </span>
            </div>
            {!isLast && (
              <span
                aria-hidden="true"
                className={`grow h-1 rounded-full mt-4 -mx-5 ${index < current ? 'bg-mint' : 'bg-soft-line'}`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function ReadyTicket({ order }) {
  const { t } = useTranslation()

  return (
    <article
      aria-live="polite"
      className="relative bg-surface text-fg border-2 border-ink dark:border-pop rounded-[26px] shadow-[5px_5px_0_var(--color-pop)] p-5 flex flex-col gap-5 overflow-hidden"
    >
      <span aria-hidden="true" className="absolute -top-10 -end-10 w-28 h-28 rounded-full bg-brand-soft dark:bg-brand" />

      <h2 className="relative font-display font-extrabold text-3xl leading-tight">
        <Trans
          i18nKey="myOrders.readyTitle"
          components={{ pop: <span className="inline-block bg-pop text-ink px-2.5 rounded-[10px] -rotate-3" /> }}
        />
      </h2>

      <div className="relative flex flex-col items-center gap-1 bg-page border-2 border-dashed border-soft-line rounded-[20px] py-5">
        <span className="text-sm font-semibold text-muted">{t('myOrders.orderNumber')}</span>
        <span className="font-display font-extrabold text-7xl leading-none text-brand dark:text-pop">#{order.id}</span>
        {order.pickup_at && (
          <span className="mt-2 flex items-center gap-2 bg-surface border-2 border-line rounded-full px-3.5 py-1.5 font-bold">
            <ClockIcon size={16} strokeWidth={2.4} />
            {t('myOrders.pickup', { time: formatTime(order.pickup_at) })}
          </span>
        )}
        <span className="mt-1 text-sm text-muted">{t('myOrders.showCounter')}</span>
      </div>

      <Progress status="ready" />

      <p className="flex justify-between items-baseline font-bold">
        <span className="text-muted font-semibold">{t('cart.total')}</span>
        <span className="font-display font-extrabold text-xl">{formatPrice(order.total)}</span>
      </p>
    </article>
  )
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

  const readyOrders = orders.filter((o) => o.status === 'ready')
  const otherOrders = orders.filter((o) => o.status !== 'ready')

  return (
    <section className="flex flex-col gap-4">
      {readyOrders.map((order) => (
        <ReadyTicket key={order.id} order={order} />
      ))}

      {otherOrders.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display font-extrabold text-xl">{t('myOrders.title')}</h2>
          {otherOrders.map((order) => (
            <div
              key={order.id}
              className="bg-surface text-fg border-2 border-line rounded-[20px] shadow-hard-sm p-4 flex flex-col gap-4"
            >
              <div className="flex justify-between items-center gap-3">
                <div>
                  <p className="font-display font-extrabold text-2xl">#{order.id}</p>
                  <p className="text-sm text-muted">
                    {formatPrice(order.total)}
                    {order.pickup_at && ` · ${t('myOrders.pickup', { time: formatTime(order.pickup_at) })}`}
                  </p>
                </div>
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${STATUS_STYLE[order.status]}`}>
                  {t(`myOrders.status.${order.status}`)}
                </span>
              </div>
              {order.status !== 'cancelled' && <Progress status={order.status} />}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
