import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatTime } from '../lib/format'
import { pick } from '../lib/localize'
import { inputClass } from './NameFields'
import { PlusIcon } from './icons'

const cardClass = 'bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4 flex flex-col gap-3'
const errorText = 'text-sm font-semibold text-red-600 dark:text-red-400'
const PIN_ERRORS = ['PIN_FORMAT', 'PIN_TOO_EASY', 'NAME_TAKEN']

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }) // YYYY-MM-DD

function useServerError() {
  const { t } = useTranslation()
  return (message) => (PIN_ERRORS.includes(message) ? t(`manager.team.errors.${message}`) : message)
}

// ---------- Add / edit one person ----------

function StaffForm({ member, onSaved, onCancel }) {
  const { t } = useTranslation()
  const serverError = useServerError()
  const [name, setName] = useState(member?.display_name ?? '')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) return setError(t('manager.team.errors.name'))
    const changingPin = !member || pin !== ''
    if (changingPin && !/^[0-9]{4,6}$/.test(pin)) return setError(t('manager.team.errors.PIN_FORMAT'))
    if (changingPin && pin !== pin2) return setError(t('manager.team.errors.pinMatch'))

    setSaving(true)
    const { error } = member
      ? await supabase.rpc('update_staff_member', { p_id: member.id, p_name: name.trim(), p_pin: pin || null })
      : await supabase.rpc('create_staff_member', { p_name: name.trim(), p_pin: pin })
    setSaving(false)

    if (error) return setError(serverError(error.message))
    onSaved()
  }

  const pinInput = (value, setValue, label) => (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        maxLength={6}
        dir="ltr"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        className={`${inputClass} tracking-[0.4em]`}
      />
    </label>
  )

  return (
    <form onSubmit={save} className={cardClass}>
      <h2 className="font-display font-extrabold text-xl">
        {member ? t('manager.team.edit', { name: member.display_name }) : t('manager.team.add')}
      </h2>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t('manager.team.name')}
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pinInput(pin, setPin, member ? t('manager.team.newPin') : t('manager.team.pin'))}
        {pinInput(pin2, setPin2, t('manager.team.pinAgain'))}
      </div>
      <p className="text-xs text-muted">{member ? t('manager.team.pinKeep') : t('manager.team.pinHint')}</p>

      {error && <p className={errorText}>{error}</p>}

      <div className="flex gap-2">
        <button
          disabled={saving}
          className="grow h-12 bg-brand text-white border-2 border-ink rounded-2xl font-bold shadow-hard-sm disabled:opacity-50"
        >
          {saving ? t('manager.saving') : t('manager.team.save')}
        </button>
        <button type="button" onClick={onCancel} className="h-12 px-4 rounded-2xl border-2 border-line bg-surface font-bold">
          {t('manager.cancel')}
        </button>
      </div>
    </form>
  )
}

// ---------- Activity log ----------

function ActivityLog() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const [date, setDate] = useState(today)
  const [shift, setShift] = useState('all')
  const [person, setPerson] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    supabase.rpc('staff_activity_log', { p_from: date, p_to: date }).then(({ data, error }) => {
      if (!active) return
      setError(error?.message ?? null)
      setRows(data ?? [])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [date])

  const people = useMemo(() => [...new Set(rows.map((r) => r.person))].sort(), [rows])
  const shown = rows.filter((r) => (shift === 'all' || r.shift === shift) && (person === 'all' || r.person === person))

  function describe(row) {
    const known = t(`manager.team.actions.${row.action}`, {
      order: row.order_id,
      item: pick(row.details?.name, lang),
      defaultValue: '',
    })
    return known || row.action
  }

  return (
    <section className={cardClass}>
      <h2 className="font-display font-extrabold text-xl">{t('manager.team.logTitle')}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.team.day')}
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => {
              setLoading(true)
              setDate(e.target.value || today())
            }}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.team.shift')}
          <select value={shift} onChange={(e) => setShift(e.target.value)} className={inputClass}>
            <option value="all">{t('manager.team.all')}</option>
            <option value="morning">{t('manager.team.shifts.morning')}</option>
            <option value="evening">{t('manager.team.shifts.evening')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.team.person')}
          <select value={person} onChange={(e) => setPerson(e.target.value)} className={inputClass}>
            <option value="all">{t('manager.team.all')}</option>
            {people.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className={errorText}>{error}</p>}
      {loading ? (
        <p className="text-muted">{t('manager.team.loading')}</p>
      ) : shown.length === 0 ? (
        <p className="text-muted">{t('manager.team.noActivity')}</p>
      ) : (
        <ul className="flex flex-col divide-y-2 divide-dashed divide-soft-line">
          {shown.map((row, i) => (
            <li key={i} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-sm text-muted w-12" dir="ltr">
                {formatTime(row.happened_at)}
              </span>
              <span className="font-bold">{row.person}</span>
              {row.by_manager && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-chip">{t('staff.role.manager')}</span>
              )}
              <span className="grow min-w-0">{describe(row)}</span>
              <span className="text-xs font-semibold text-muted">{t(`manager.team.shifts.${row.shift}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------- Screen ----------

export default function ManagerStaff() {
  const { t } = useTranslation()
  const serverError = useServerError()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(null) // null | 'new' | member id
  const [notSetUp, setNotSetUp] = useState(false)

  async function load() {
    const { data, error } = await supabase.rpc('manager_staff_list')
    if (error?.code === 'PGRST202') setNotSetUp(true) // database/12_staff_pins.sql not run yet
    else if (error) setError(error.message)
    else setMembers(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function setActive(member, active) {
    setError(null)
    const { error } = await supabase.rpc('set_staff_active', { p_id: member.id, p_active: active })
    if (error) setError(serverError(error.message))
    else load()
  }

  function saved() {
    setForm(null)
    load()
  }

  if (loading) return <p className="text-muted">{t('manager.team.loading')}</p>
  if (notSetUp) return <p className="text-muted">{t('manager.team.notSetUp')}</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted max-w-xl">{t('manager.team.intro')}</p>
        {form !== 'new' && (
          <button
            onClick={() => setForm('new')}
            className="h-11 px-4 rounded-full border-2 border-ink bg-pop text-ink font-bold shadow-hard-sm flex items-center gap-2"
          >
            <PlusIcon size={18} strokeWidth={2.6} />
            {t('manager.team.add')}
          </button>
        )}
      </div>

      {error && <p className={errorText}>{error}</p>}
      {form === 'new' && <StaffForm onSaved={saved} onCancel={() => setForm(null)} />}
      {members.length === 0 && form !== 'new' && <p className="text-muted">{t('manager.team.empty')}</p>}

      <ul className="grid gap-3 sm:grid-cols-2">
        {members.map((member) =>
          form === member.id ? (
            <li key={member.id} className="sm:col-span-2">
              <StaffForm member={member} onSaved={saved} onCancel={() => setForm(null)} />
            </li>
          ) : (
            <li key={member.id} className={`${cardClass} ${member.is_active ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="w-11 h-11 shrink-0 rounded-full bg-pop text-ink font-extrabold flex items-center justify-center"
                >
                  {member.display_name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg truncate">{member.display_name}</p>
                  <p className="text-xs text-muted">
                    {member.last_seen_at
                      ? t('manager.team.lastSeen', {
                          time: `${new Date(member.last_seen_at).toLocaleDateString('tr-TR')} ${formatTime(member.last_seen_at)}`,
                        })
                      : t('manager.team.never')}
                    {member.locked_until && new Date(member.locked_until) > new Date() && ` · ${t('manager.team.lockedNow')}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button onClick={() => setForm(member.id)} className="h-10 px-4 rounded-full border-2 border-line bg-surface font-bold">
                  {t('manager.team.editButton')}
                </button>
                <button
                  onClick={() => setActive(member, !member.is_active)}
                  className={`h-10 px-4 rounded-full border-2 border-ink font-bold text-ink ${
                    member.is_active ? 'bg-mint' : 'bg-coral'
                  }`}
                >
                  {member.is_active ? t('manager.team.active') : t('manager.team.inactive')}
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      <ActivityLog />
    </div>
  )
}
