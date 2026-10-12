import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, formatTime } from '../lib/format'
import { pick } from '../lib/localize'
import { printReceipt } from '../lib/print'
import Receipt from './Receipt'
import OrderingToggle from './OrderingToggle'
import { ClockIcon } from './icons'

const NEXT_STATUS = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
}

const STATUS_STYLE = {
  pending: 'bg-pop text-ink',
  preparing: 'bg-brand-soft text-ink',
  ready: 'bg-mint text-ink',
}

export default function StaffDashboard() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const [orders, setOrders] = useState([])
  const [error, setError] = useState(null)
  const [printJob, setPrintJob] = useState(null)

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
    if (printJob) printReceipt()
  }, [printJob])

  async function changeStatus(orderId, status) {
    if (status === 'cancelled' && !confirm(t('staff.confirmCancel', { id: orderId }))) return

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
    <div className="flex flex-col gap-4">
      <OrderingToggle />

      <h2 className="font-display font-extrabold text-2xl">
        {t('staff.activeOrders', { count: orders.length })}
      </h2>

      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
      {orders.length === 0 && <p className="text-muted">{t('staff.noOrders')}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {orders.map((order) => {
          const nextStatus = NEXT_STATUS[order.status]
          const needsPayment = nextStatus === 'completed' && !order.is_paid

          return (
            <article
              key={order.id}
              className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4 flex flex-col gap-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col">
                  <span className="font-display font-extrabold text-3xl leading-none">#{order.id}</span>
                  {order.pickup_at && (
                    <span className="flex items-center gap-1.5 mt-1.5 font-bold text-brand dark:text-pop">
                      <ClockIcon size={16} strokeWidth={2.4} />
                      {formatTime(order.pickup_at)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[order.status]}`}>
                    {t(`staff.status.${order.status}`)}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      order.is_paid
                        ? 'bg-mint-soft text-ink'
                        : 'bg-chip text-muted border border-soft-line'
                    }`}
                  >
                    {order.is_paid ? t('staff.paid') : t('staff.unpaid')}
                  </span>
                </div>
              </div>

              <ul className="flex flex-col gap-1.5">
                {order.order_items.map((item) => (
                  <li key={item.id}>
                    <span className="font-semibold">
                      {item.quantity} × {pick(item.item_name, lang)}
                    </span>
                    {item.order_item_options.length > 0 && (
                      <span className="block text-sm text-muted ms-6">
                        {item.order_item_options
                          .map((o) => pick(o.name, lang))
                          .join(lang === 'ar' ? '، ' : ', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {order.note && (
                <p className="text-sm bg-pop/30 dark:bg-chip rounded-xl px-3 py-2">
                  {t('staff.note', { note: order.note })}
                </p>
              )}

              <div className="flex justify-between items-baseline text-sm text-muted">
                <span>{t('staff.ordered', { time: formatTime(order.created_at) })}</span>
                <span className="font-display font-extrabold text-lg text-fg">{formatPrice(order.total)}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {!order.is_paid && (
                  <button
                    onClick={() => markPaid(order.id)}
                    className="h-12 px-4 rounded-2xl border-2 border-ink bg-mint text-ink font-bold"
                  >
                    {t('staff.markPaid')}
                  </button>
                )}

                <button
                  onClick={() => setPrintJob({ order, at: Date.now() })}
                  className="h-12 px-4 rounded-2xl border-2 border-line bg-surface font-bold"
                >
                  {t('staff.print')}
                </button>

                <button
                  onClick={() => changeStatus(order.id, nextStatus)}
                  disabled={needsPayment}
                  title={needsPayment ? t('staff.payFirst') : ''}
                  className="grow h-12 px-4 rounded-2xl border-2 border-ink bg-brand text-white font-bold shadow-hard-sm disabled:opacity-40 disabled:shadow-none"
                >
                  {t(`staff.next.${order.status}`)}
                </button>

                {!order.is_paid && (
                  <button
                    onClick={() => changeStatus(order.id, 'cancelled')}
                    className="h-12 px-4 rounded-2xl border-2 border-red-300 dark:border-red-400 text-red-600 dark:text-red-400 font-bold"
                  >
                    {t('staff.cancel')}
                  </button>
                )}
              </div>

              {needsPayment && (
                <p className="text-xs font-semibold text-muted">{t('staff.payFirst')}</p>
              )}
            </article>
          )
        })}
      </div>

      <Receipt order={printJob?.order} />
    </div>
  )
}