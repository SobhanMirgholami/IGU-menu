import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatTime } from '../lib/format'

const STATUSES = ['new', 'in_progress', 'fixed', 'wont_fix']
const STATUS_STYLE = {
  new: 'bg-pop text-ink',
  in_progress: 'bg-brand-soft text-ink',
  fixed: 'bg-mint text-ink',
  wont_fix: 'bg-chip text-fg',
}

// "Mozilla/5.0 (iPhone; ...) ... | 390x844 | browser | dark" -> "iPhone · Safari · 390x844 · browser · dark"
function shortDevice(device = '') {
  const [agent = '', ...rest] = device.split(' | ')
  const os = /iphone|ipad/i.test(agent) ? 'iPhone/iPad' : /android/i.test(agent) ? 'Android' : /windows/i.test(agent) ? 'Windows' : /mac os/i.test(agent) ? 'Mac' : /linux/i.test(agent) ? 'Linux' : '?'
  const browser = /edg\//i.test(agent) ? 'Edge' : /opr\//i.test(agent) ? 'Opera' : /firefox|fxios/i.test(agent) ? 'Firefox' : /chrome|crios/i.test(agent) ? 'Chrome' : /safari/i.test(agent) ? 'Safari' : '?'
  return [os, browser, ...rest].join(' · ')
}

function ReportCard({ report, onSaved }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState(report.status)
  const [note, setNote] = useState(report.dev_note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const changed = status !== report.status || note !== (report.dev_note ?? '')

  async function save() {
    setSaving(true)
    setError(null)
    const { error } = await supabase.rpc('update_bug_report', { p_id: report.id, p_status: status, p_note: note })
    setSaving(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <li className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display font-extrabold text-lg">#{report.id}</p>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${STATUS_STYLE[report.status]}`}>
          {t(`bugs.status.${report.status}`)}
        </span>
      </div>

      <p className="whitespace-pre-wrap break-words">{report.message}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted font-semibold">{t('bugs.from')}</dt>
        <dd className="break-all" dir="ltr">
          {report.email ?? '?'} · {t(`staff.role.${report.role}`, { defaultValue: report.role })}
        </dd>
        <dt className="text-muted font-semibold">{t('bugs.when')}</dt>
        <dd dir="ltr">
          {new Date(report.created_at).toLocaleDateString('tr-TR')} {formatTime(report.created_at)}
        </dd>
        <dt className="text-muted font-semibold">{t('bugs.where')}</dt>
        <dd>
          {report.page ?? '?'} · {report.lang?.toUpperCase()}
        </dd>
        <dt className="text-muted font-semibold">{t('bugs.device')}</dt>
        <dd className="break-words" title={report.device}>
          {shortDevice(report.device ?? '')}
        </dd>
      </dl>

      <div className="flex flex-col gap-2 pt-2 border-t-2 border-soft-line">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={`h-9 px-3 rounded-full border-2 text-sm font-bold ${
                status === s ? 'bg-ink text-white border-ink dark:bg-pop dark:text-ink dark:border-pop' : 'bg-surface border-line'
              }`}
            >
              {t(`bugs.status.${s}`)}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          maxLength={1000}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('bugs.notePlaceholder')}
          className="w-full rounded-xl border-2 border-line bg-page text-fg p-2.5 text-sm placeholder:text-muted focus:outline-none focus:border-brand dark:focus:border-pop resize-none"
        />
        {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
        {changed && (
          <button
            onClick={save}
            disabled={saving}
            className="self-start h-10 px-5 bg-brand text-white border-2 border-ink rounded-full font-bold text-sm shadow-hard-sm disabled:opacity-50"
          >
            {saving ? t('manager.saving') : t('bugs.save')}
          </button>
        )}
      </div>
    </li>
  )
}

export default function BugReports() {
  const { t } = useTranslation()
  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState('open') // open = new + in progress
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notSetUp, setNotSetUp] = useState(false)

  async function load() {
    const { data, error } = await supabase
      .from('bug_reports')
      .select('id, email, role, message, page, lang, device, status, dev_note, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error?.code === 'PGRST205' || error?.code === '42P01') setNotSetUp(true) // 13_bug_reports.sql not run yet
    else if (error) setError(error.message)
    else setReports(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <p className="text-muted">{t('bugs.loading')}</p>
  if (notSetUp) return <p className="text-muted">{t('bugs.notSetUp')}</p>

  const counts = Object.fromEntries(STATUSES.map((s) => [s, reports.filter((r) => r.status === s).length]))
  const shown = reports.filter((r) =>
    filter === 'open' ? r.status === 'new' || r.status === 'in_progress' : filter === 'all' || r.status === filter
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {['open', 'all', ...STATUSES].map((f) => {
          const count = f === 'open' ? counts.new + counts.in_progress : f === 'all' ? reports.length : counts[f]
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`h-10 px-4 rounded-full border-2 font-bold text-sm ${
                filter === f ? 'bg-ink text-white border-ink dark:bg-pop dark:text-ink dark:border-pop' : 'bg-surface border-line'
              }`}
            >
              {f === 'open' || f === 'all' ? t(`bugs.filter.${f}`) : t(`bugs.status.${f}`)} ({count})
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
      {shown.length === 0 && <p className="text-muted">{t('bugs.none')}</p>}

      <ul className="grid gap-3 sm:grid-cols-2">
        {shown.map((report) => (
          <ReportCard key={`${report.id}-${report.status}-${report.dev_note}`} report={report} onSaved={load} />
        ))}
      </ul>
    </div>
  )
}
