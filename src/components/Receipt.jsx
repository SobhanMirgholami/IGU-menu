import { formatPrice, formatTime } from '../lib/format'

const formatDateTime = (date) =>
  new Date(date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  })

export default function Receipt({ order }) {
  if (!order) return null

  return (
    <div id="receipt" aria-hidden="true" className="fixed top-0 left-0 invisible pointer-events-none w-[80mm] text-black bg-white p-3 font-mono text-xs" dir="ltr">
      <p className="text-center text-base font-bold">IGU Café</p>
      <p className="text-center">{formatDateTime(order.created_at)}</p>

      <p className="text-center text-3xl font-bold my-2">#{order.id}</p>
      {order.pickup_at && (
        <p className="text-center text-base font-bold">Teslim: {formatTime(order.pickup_at)}</p>
      )}

      <div className="border-t border-dashed border-black my-2" />

      {order.order_items.map((item) => (
        <div key={item.id}>
          <div className="flex justify-between">
            <span>
              {item.quantity} × {item.item_name.tr}
            </span>
            <span>{formatPrice(item.unit_price * item.quantity)}</span>
          </div>
          {item.order_item_options.map((o) => (
            <p key={o.id} className="ps-4">- {o.name.tr}</p>
          ))}
        </div>
      ))}

      <div className="border-t border-dashed border-black my-2" />

      <div className="flex justify-between font-bold text-sm">
        <span>TOPLAM</span>
        <span>{formatPrice(order.total)}</span>
      </div>

      <p className="text-center font-bold mt-1">{order.is_paid ? 'ÖDENDİ' : 'ÖDENMEDİ'}</p>

      {order.note && <p className="mt-2">Not: {order.note}</p>}

      <p className="text-center mt-3">Teşekkürler!</p>
    </div>
  )
}