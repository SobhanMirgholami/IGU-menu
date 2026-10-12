import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function OrderingToggle() {
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
    if (accepting && !confirm('Pause online orders? Students will not be able to order.')) return

    const { error } = await supabase.rpc('set_accepting_orders', { p_accepting: !accepting })
    if (error) alert(error.message)
    else load()
  }

  if (accepting === null) return null

  return (
    <div
      className={`flex items-center justify-between rounded-lg p-3 ${
        accepting ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`}
    >
      <span className={accepting ? 'text-green-800' : 'text-red-800'}>
        {accepting ? '🟢 Taking online orders' : '⏸️ Online orders paused'}
      </span>
      <button
        onClick={toggle}
        className={`px-4 py-2 rounded-lg text-white ${accepting ? 'bg-red-600' : 'bg-green-600'}`}
      >
        {accepting ? 'Pause' : 'Resume'}
      </button>
    </div>
  )
}