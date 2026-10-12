import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { staffRpc } from '../lib/staffSession'

export default function OrderingToggle() {
  const { t } = useTranslation()
  const [accepting, setAccepting] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('cafe_settings')
      .select('is_accepting_orders')
      .eq('id', 1)
      .single()

    setAccepting(data?.is_accepting_orders ?? null)
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('staff-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_settings' }, () => {
        load()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function toggle() {
    if (accepting && !confirm(t('staff.confirmPause'))) return

    const { error } = await staffRpc('set_accepting_orders', { p_accepting: !accepting })
    if (error) {
      if (error.message !== 'PIN_REQUIRED') alert(error.message)
    } else load()
  }

  if (accepting === null) return null

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[20px] border-2 p-3 ps-4 ${
        accepting
          ? 'bg-mint-soft text-ink border-ink dark:bg-surface dark:text-fg dark:border-line'
          : 'bg-coral-soft text-ink border-ink dark:bg-surface dark:text-fg dark:border-coral'
      }`}
    >
      <span className="flex items-center gap-2.5 font-bold">
        <span
          aria-hidden="true"
          className={`w-3 h-3 rounded-full ${accepting ? 'bg-mint' : 'bg-coral'}`}
        />
        {accepting ? t('staff.accepting') : t('staff.paused')}
      </span>
      <button
        onClick={toggle}
        className={`h-11 px-5 rounded-full border-2 border-ink font-bold text-ink shadow-hard-sm ${
          accepting ? 'bg-coral' : 'bg-mint'
        }`}
      >
        {accepting ? t('staff.pause') : t('staff.resume')}
      </button>
    </div>
  )
}