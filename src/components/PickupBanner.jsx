import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatTime } from '../lib/format'
import { ClockIcon } from './icons'

export default function PickupBanner() {
  const { t } = useTranslation()
  const [info, setInfo] = useState(null)

  useEffect(() => {
    async function load() {
      const [settingsResult, slotsResult] = await Promise.all([
        supabase.from('cafe_settings').select('is_accepting_orders').eq('id', 1).single(),
        supabase.rpc('get_pickup_slots'),
      ])

      setInfo({
        accepting: settingsResult.data?.is_accepting_orders ?? false,
        next: (slotsResult.data ?? []).find((s) => s.remaining > 0) ?? null,
      })
    }

    load()
    const timer = setInterval(load, 60000)

    const channel = supabase
      .channel('banner-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_settings' }, () => {
        load()
      })
      .subscribe()

    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  if (!info) return null

  let title = t('home.noSlots')
  let subtitle = null
  let badge = null

  if (!info.accepting) {
    title = t('home.paused')
  } else if (info.next) {
    title = t('home.nextPickup', { time: formatTime(info.next.slot_start) })
    subtitle = t('home.skipLine')
    if (info.next.remaining <= 3) badge = t('home.left', { count: info.next.remaining })
  }

  return (
    <div className="flex items-center gap-3 bg-surface text-fg border-2 border-ink rounded-[20px] shadow-hard px-3.5 py-3">
      <div className="w-11 h-11 rounded-[14px] bg-brand-soft text-brand flex items-center justify-center shrink-0">
        <ClockIcon size={22} strokeWidth={2.2} />
      </div>
      <div className="grow flex flex-col gap-0.5">
        <p className="font-bold text-[15px]">{title}</p>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      {badge && (
        <span className="bg-coral text-ink font-bold text-xs px-2.5 py-1.5 rounded-xl border-2 border-ink rotate-3">
          {badge}
        </span>
      )}
    </div>
  )
}