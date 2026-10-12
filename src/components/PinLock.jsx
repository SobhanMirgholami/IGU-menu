import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { saveStaffSession } from '../lib/staffSession'
import { ArrowIcon } from './icons'

const MAX_DIGITS = 6
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok']

// "Who's working?" -> tap your name -> type your PIN
export default function PinLock({ onUnlock }) {
  const { t } = useTranslation()
  const [staff, setStaff] = useState(null)
  const [person, setPerson] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    supabase.rpc('terminal_staff_list').then(({ data, error }) => {
      if (error) setError(error.message)
      setStaff(data ?? [])
    })
  }, [])

  const submit = useCallback(async () => {
    if (!person || pin.length < 4 || checking) return
    setChecking(true)
    setError(null)

    const { data, error } = await supabase.rpc('staff_unlock', { p_staff_id: person.id, p_pin: pin })
    setChecking(false)
    setPin('')

    if (error) return setError(error.message)
    if (!data?.ok) {
      const messages = { WRONG_PIN: 'staff.pin.wrong', LOCKED: 'staff.pin.locked' }
      return setError(t(messages[data?.error] ?? 'staff.pin.failed'))
    }

    saveStaffSession(data.session)
    onUnlock(data.name)
  }, [person, pin, checking, onUnlock, t])

  const press = useCallback(
    (key) => {
      setError(null)
      if (key === 'back') setPin((p) => p.slice(0, -1))
      else if (key === 'ok') submit()
      else setPin((p) => (p.length < MAX_DIGITS ? p + key : p))
    },
    [submit]
  )

  // Physical keyboard works too: digits, Backspace, Enter, Escape
  useEffect(() => {
    if (!person) return
    function onKey(e) {
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('back')
      else if (e.key === 'Enter') press('ok')
      else if (e.key === 'Escape') setPerson(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [person, press])

  if (staff === null) return <p className="text-muted">{t('staff.pin.loading')}</p>

  // Step 1: pick your name
  if (!person) {
    return (
      <section className="flex flex-col gap-4 max-w-xl">
        <h2 className="font-display font-extrabold text-3xl">{t('staff.pin.whoIsWorking')}</h2>
        {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
        {staff.length === 0 ? (
          <p className="text-muted">{t('staff.pin.noStaff')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {staff.map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  setPerson(member)
                  setPin('')
                  setError(null)
                }}
                className="h-20 rounded-[20px] border-2 border-ink bg-surface shadow-hard-sm font-display font-bold text-xl px-3 flex items-center justify-center gap-3"
              >
                <span
                  aria-hidden="true"
                  className="w-10 h-10 shrink-0 rounded-full bg-pop text-ink font-extrabold flex items-center justify-center"
                >
                  {member.display_name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{member.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    )
  }

  // Step 2: type the PIN
  return (
    <section className="flex flex-col items-center gap-5 max-w-xs mx-auto w-full">
      <button
        onClick={() => setPerson(null)}
        className="self-start h-10 px-4 rounded-full border-2 border-line bg-surface font-bold text-sm flex items-center gap-2"
      >
        <ArrowIcon size={16} strokeWidth={2.4} className="rotate-180 rtl:rotate-0" />
        {t('staff.pin.notMe')}
      </button>

      <h2 className="font-display font-extrabold text-2xl text-center">
        {t('staff.pin.hello', { name: person.display_name })}
      </h2>
      <p className="text-muted -mt-3">{t('staff.pin.enter')}</p>

      <div className="flex gap-3 h-5" dir="ltr" aria-label={t('staff.pin.digits', { count: pin.length })}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span
            key={i}
            className={`w-4 h-4 rounded-full border-2 border-ink dark:border-fg ${i < pin.length ? 'bg-ink dark:bg-pop' : ''}`}
          />
        ))}
      </div>

      <p role="alert" className="min-h-5 text-sm font-semibold text-red-600 dark:text-red-400 text-center">
        {error}
      </p>

      <div className="grid grid-cols-3 gap-3 w-full" dir="ltr">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => press(key)}
            disabled={checking || (key === 'ok' && pin.length < 4)}
            aria-label={key === 'back' ? t('staff.pin.delete') : key === 'ok' ? t('staff.pin.go') : key}
            className={`h-16 rounded-2xl border-2 font-display font-extrabold text-2xl disabled:opacity-40 ${
              key === 'ok'
                ? 'bg-brand text-white border-ink shadow-hard-sm'
                : key === 'back'
                  ? 'bg-surface border-line text-lg'
                  : 'bg-surface border-ink shadow-hard-sm'
            }`}
          >
            {key === 'back' ? '⌫' : key === 'ok' ? '✓' : key}
          </button>
        ))}
      </div>
    </section>
  )
}
