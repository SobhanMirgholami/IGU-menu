import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, formatTime } from '../lib/format'
import { pick } from '../lib/localize'
import { translateError } from '../lib/errors'

export default function Cart({ cart, setCart }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [orderId, setOrderId] = useState(null)
  const [slots, setSlots] = useState([])
  const [pickupAt, setPickupAt] = useState('')
  const [accepting, setAccepting] = useState(true)

  async function loadSlots() {
    const [settingsResult, slotsResult] = await Promise.all([
      supabase.from('cafe_settings').select('is_accepting_orders').eq('id', 1).single(),
      supabase.rpc('get_pickup_slots'),
    ])

    const newSlots = slotsResult.data ?? []
    setAccepting(settingsResult.data?.is_accepting_orders ?? false)
    setSlots(newSlots)
    setPickupAt((prev) => {
      const stillOpen = newSlots.some((s) => s.slot_start === prev && s.remaining > 0)
      if (stillOpen) return prev
      return newSlots.find((s) => s.remaining > 0)?.slot_start ?? ''
    })
  }

  useEffect(() => {
    loadSlots()

    const timer = setInterval(loadSlots, 60000)

    const channel = supabase
      .channel('cafe-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_settings' }, () => {
        loadSlots()
      })
      .subscribe()

    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

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
      p_pickup_at: pickupAt,
      p_note: note.trim() || null,
    })

    setLoading(false)

    if (error) {
      setError(translateError(error.message, t))
      loadSlots()
    } else {
      setOrderId(data)
      setCart([])
      setNote('')
      loadSlots()
    }
  }

  if (orderId) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm text-center">
        <p className="text-gray-600">{t('cart.placed')}</p>
        <p className="text-4xl font-bold text-amber-800 my-2">#{orderId}</p>
        <p className="text-sm text-gray-500 mb-4">{t('cart.showNumber')}</p>
        <button onClick={() => setOrderId(null)} className="text-amber-800 underline text-sm">
          {t('cart.newOrder')}
        </button>
      </div>
    )
  }

  if (!accepting) {
    return (
      <div className="bg-amber-100 border border-amber-300 rounded-lg p-4 text-amber-900 text-sm">
        {t('cart.paused')}
      </div>
    )
  }

  if (cart.length === 0) {
    return <p className="text-gray-500 text-sm">{t('cart.empty')}</p>
  }

  const hasOpenSlot = slots.some((s) => s.remaining > 0)

  function slotLabel(slot) {
    if (slot.remaining <= 0) return `${formatTime(slot.slot_start)} ${t('cart.full')}`
    if (slot.remaining <= 3) return `${formatTime(slot.slot_start)} ${t('cart.left', { count: slot.remaining })}`
    return formatTime(slot.slot_start)
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
      <h2 className="font-semibold text-amber-800">{t('cart.title')}</h2>

      {cart.map((line) => (
        <div key={line.key} className="flex items-center justify-between gap-2">
          <div>
            <p>{pick(line.name, lang)}</p>
            {line.options.length > 0 && (
              <p className="text-xs text-gray-500">
                {line.options.map((o) => pick(o.name, lang)).join(lang === 'ar' ? '، ' : ', ')}
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

      <label className="block text-sm">
        {t('cart.pickupTime')}
        {hasOpenSlot ? (
          <select
            value={pickupAt}
            onChange={(e) => setPickupAt(e.target.value)}
            className="w-full border rounded-lg p-2 mt-1"
          >
            {slots.map((slot) => (
              <option key={slot.slot_start} value={slot.slot_start} disabled={slot.remaining <= 0}>
                {slotLabel(slot)}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-red-600 mt-1">{t('cart.noSlots')}</p>
        )}
      </label>

      <textarea
        placeholder={t('cart.notePlaceholder')}
        maxLength={200}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full border rounded-lg p-2 text-sm"
      />

      <div className="flex justify-between font-semibold">
        <span>{t('cart.total')}</span>
        <span>{formatPrice(total)}</span>
      </div>

      <button
        onClick={placeOrder}
        disabled={loading || !pickupAt}
        className="w-full bg-amber-700 text-white rounded-lg p-3 disabled:opacity-50"
      >
        {loading ? t('cart.placing') : t('cart.placeOrder')}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}