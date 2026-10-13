import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, formatTime } from '../lib/format'
import { pick } from '../lib/localize'
import { translateError } from '../lib/errors'
import { LEGAL_PAGES, TERMS_VERSION, hasRead, onReadChange, rememberOnThisDevice } from '../lib/legal'
import { askForNotifications, notificationsAllowed, notificationsSupported, subscribeToPush } from '../lib/pwa'
import { MinusIcon, PlusIcon } from './icons'

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
  const [termsAccepted, setTermsAccepted] = useState(null) // null = still checking
  const [agree, setAgree] = useState(false)
  const [readAll, setReadAll] = useState(() => LEGAL_PAGES.every(hasRead))
  useEffect(() => onReadChange(() => setReadAll(LEGAL_PAGES.every(hasRead))), [])
  const [notify, setNotify] = useState(() =>
    !notificationsSupported() ? 'unsupported' : notificationsAllowed() ? 'granted' : Notification.permission
  )

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

  // Did this student already accept the current terms?
  useEffect(() => {
    supabase
      .from('terms_acceptances')
      .select('terms_version')
      .eq('terms_version', TERMS_VERSION)
      .maybeSingle()
      .then(({ data }) => setTermsAccepted(Boolean(data)))
  }, [])

  async function enableNotifications() {
    const result = await askForNotifications()
    setNotify(result)
    if (result === 'granted') subscribeToPush(lang) // also works when the app is closed
  }

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
    setError(null)

    if (!termsAccepted) {
      if (!readAll) return setError(t('legal.readFirst'))
      if (!agree) return setError(t('cart.mustAgree'))
      const { error } = await supabase.rpc('accept_terms', { p_version: TERMS_VERSION })
      // PGRST202 = database/14_terms.sql not run yet: nothing to save, so just continue
      if (error && error.code !== 'PGRST202') return setError(error.message)
      rememberOnThisDevice()
      setTermsAccepted(true)
    }

    setLoading(true)

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
      <div className="bg-surface border-2 border-line rounded-[22px] shadow-hard p-6 text-center flex flex-col items-center gap-1">
        <p className="font-semibold text-muted">{t('cart.placed')}</p>
        <p className="font-display font-extrabold text-6xl text-brand dark:text-pop my-1">#{orderId}</p>
        <p className="text-sm text-muted mb-3">{t('cart.showNumber')}</p>
        {notify === 'default' && (
          <button
            onClick={enableNotifications}
            className="h-11 px-5 mb-2 rounded-full border-2 border-ink bg-pop text-ink font-bold shadow-hard-sm"
          >
            🔔 {t('pwa.notifyMe')}
          </button>
        )}
        {notify === 'granted' && <p className="text-sm font-semibold mb-2">🔔 {t('pwa.willNotify')}</p>}
        <button
          onClick={() => setOrderId(null)}
          className="h-11 px-5 rounded-full border-2 border-line bg-surface text-fg font-bold"
        >
          {t('cart.newOrder')}
        </button>
      </div>
    )
  }

  if (!accepting) {
    return (
      <div className="bg-coral-soft text-ink border-2 border-ink rounded-[20px] p-4 font-semibold dark:bg-surface dark:text-fg dark:border-coral">
        {t('cart.paused')}
      </div>
    )
  }

  if (cart.length === 0) {
    return <p className="text-muted text-sm">{t('cart.empty')}</p>
  }

  const hasOpenSlot = slots.some((s) => s.remaining > 0)

  return (
    <div className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4 flex flex-col gap-5">
      <h2 className="font-display font-extrabold text-2xl">{t('cart.title')}</h2>

      <ul className="flex flex-col gap-3">
        {cart.map((line) => (
          <li key={line.key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold">{pick(line.name, lang)}</p>
              {line.options.length > 0 && (
                <p className="text-sm text-muted">
                  {line.options.map((o) => pick(o.name, lang)).join(lang === 'ar' ? '، ' : ', ')}
                </p>
              )}
              <p className="text-sm font-semibold text-brand dark:text-pop">{formatPrice(line.unitPrice)}</p>
            </div>
            <div className="flex items-center gap-1 border-2 border-line rounded-full p-0.5 shrink-0">
              <button
                onClick={() => changeQuantity(line.key, -1)}
                aria-label="−"
                className="w-10 h-10 rounded-full bg-chip text-fg flex items-center justify-center"
              >
                <MinusIcon size={18} strokeWidth={2.6} />
              </button>
              <span className="w-6 text-center font-extrabold">{line.quantity}</span>
              <button
                onClick={() => changeQuantity(line.key, 1)}
                aria-label="+"
                className="w-10 h-10 rounded-full bg-chip text-fg flex items-center justify-center"
              >
                <PlusIcon size={18} strokeWidth={2.6} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <fieldset className="flex flex-col gap-2.5 min-w-0">
        <legend className="font-display font-bold text-lg mb-2.5">{t('cart.pickupTime')}</legend>
        {hasOpenSlot ? (
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {slots.map((slot) => {
              const full = slot.remaining <= 0
              const active = slot.slot_start === pickupAt
              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  disabled={full}
                  onClick={() => setPickupAt(slot.slot_start)}
                  aria-pressed={active}
                  className={`shrink-0 min-w-20 h-14 px-3 rounded-2xl border-2 flex flex-col items-center justify-center ${
                    full
                      ? 'border-dashed border-soft-line text-muted'
                      : active
                      ? 'bg-brand text-white border-ink shadow-hard-sm'
                      : 'bg-surface text-fg border-line'
                  }`}
                >
                  <span className={`font-bold ${full ? 'line-through' : ''}`}>{formatTime(slot.slot_start)}</span>
                  {full && <span className="text-[11px] font-semibold">{t('cart.full')}</span>}
                  {!full && slot.remaining <= 3 && (
                    <span className={`text-[11px] font-bold ${active ? 'text-pop' : 'text-red-600 dark:text-coral'}`}>
                      {t('cart.left', { count: slot.remaining })}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">{t('cart.noSlots')}</p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="order-note" className="sr-only">{t('cart.notePlaceholder')}</label>
        <textarea
          id="order-note"
          placeholder={t('cart.notePlaceholder')}
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full min-h-20 rounded-2xl border-2 border-line bg-page text-fg placeholder:text-muted p-3 text-sm resize-none focus:outline-none focus:border-brand dark:focus:border-pop"
        />
      </div>

      <div className="flex justify-between items-baseline">
        <span className="font-bold">{t('cart.total')}</span>
        <span className="font-display font-extrabold text-3xl">{formatPrice(total)}</span>
      </div>

      {termsAccepted === false && !readAll && (
        <p className="text-sm font-semibold text-muted">{t('legal.readFirst')}</p>
      )}
      {termsAccepted === false && (
        <label className={`flex items-start gap-3 text-sm ${readAll ? 'cursor-pointer' : ''}`}>
          <input
            type="checkbox"
            checked={agree}
            disabled={!readAll}
            onChange={(e) => {
              setAgree(e.target.checked)
              setError(null)
            }}
            className="mt-0.5 w-5 h-5 shrink-0 accent-brand"
          />
          <span>
            <Trans
              i18nKey="cart.agree"
              components={{
                terms: <a href="#terms" className="font-bold underline underline-offset-2" />,
                privacy: <a href="#privacy" className="font-bold underline underline-offset-2" />,
              }}
            />
          </span>
        </label>
      )}

      <button
        onClick={placeOrder}
        disabled={loading || !pickupAt || termsAccepted === null}
        className="w-full h-14 rounded-2xl border-2 border-ink bg-pop text-ink font-display font-extrabold text-lg shadow-hard disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? t('cart.placing') : t('cart.placeOrder')}
      </button>

      {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
