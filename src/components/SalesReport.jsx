import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/format'

const toDateString = (date) => date.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })

const today = () => toDateString(new Date())

const daysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toDateString(date)
}

const firstOfMonth = () => today().slice(0, 8) + '01'

const PRESETS = [
  { key: 'today', from: today, to: today },
  { key: 'last7', from: () => daysAgo(6), to: today },
  { key: 'month', from: firstOfMonth, to: today },
]

const HOURS = Array.from({ length: 25 }, (_, i) => i)

const pad = (hour) => String(hour).padStart(2, '0') + ':00'

const inputClass =
  'w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg focus:outline-none focus:border-brand dark:focus:border-pop'

export default function SalesReport() {
  const { t } = useTranslation()
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [hourFrom, setHourFrom] = useState(0)
  const [hourTo, setHourTo] = useState(24)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function loadReport(range = {}) {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.rpc('sales_report', {
      p_from: range.from ?? from,
      p_to: range.to ?? to,
      p_hour_from: Number(hourFrom),
      p_hour_to: Number(hourTo),
    })

    setLoading(false)
    if (error) setError(error.message)
    else setReport(data)
  }

  useEffect(() => {
    loadReport()
  }, [])

  function applyPreset(preset) {
    const range = { from: preset.from(), to: preset.to() }
    setFrom(range.from)
    setTo(range.to)
    loadReport(range)
  }

  function exportCsv() {
    const r = (key) => t(`manager.report.${key}`)
    const rows = [
      [r('report'), `${from} – ${to}, ${pad(hourFrom)}-${pad(hourTo)}`],
      [r('income'), report.income],
      [r('orders'), report.orders],
      [r('average'), report.average],
      [r('cancelled'), report.cancelled],
      [],
      [r('item'), r('qty'), r('income')],
      ...report.items.map((item) => [item.name, item.quantity, item.income]),
    ]

    const toCell = (cell) => (typeof cell === 'number' ? String(cell).replace('.', ',') : String(cell ?? ''))

    const csv = rows
      .map((row) => row.map((cell) => `"${toCell(cell).replaceAll('"', '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `sales-${from}-to-${to}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const maxHourOrders = Math.max(1, ...(report?.by_hour ?? []).map((h) => h.orders))

  return (
    <div className="flex flex-col gap-6">
      <div className="hidden print:block">
        <h1 className="font-display font-extrabold text-2xl">IGU Café · {t('manager.report.report')}</h1>
        <p dir="ltr" className="text-start">{from} – {to}, {pad(hourFrom)}–{pad(hourTo)}</p>
      </div>

      <div className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4 flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset)}
              className="h-10 px-4 rounded-full border-2 border-line bg-surface font-bold text-sm"
            >
              {t(`manager.report.${preset.key}`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t('manager.report.from')}
            <input type="date" dir="ltr" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t('manager.report.to')}
            <input type="date" dir="ltr" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t('manager.report.startHour')}
            <select value={hourFrom} onChange={(e) => setHourFrom(e.target.value)} className={inputClass}>
              {HOURS.slice(0, 24).map((h) => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t('manager.report.endHour')}
            <select value={hourTo} onChange={(e) => setHourTo(e.target.value)} className={inputClass}>
              {HOURS.slice(1).map((h) => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={() => loadReport()}
          disabled={loading}
          className="w-full h-12 bg-brand text-white border-2 border-ink rounded-2xl font-bold shadow-hard-sm disabled:opacity-50"
        >
          {loading ? t('manager.report.loading') : t('manager.report.show')}
        </button>

        {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label={t('manager.report.income')} value={formatPrice(report.income)} />
            <Stat label={t('manager.report.orders')} value={report.orders} />
            <Stat label={t('manager.report.average')} value={formatPrice(report.average)} />
            <Stat label={t('manager.report.cancelled')} value={report.cancelled} />
          </div>

          <div className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4">
            <div className="flex justify-between items-center gap-3 mb-3">
              <h3 className="font-display font-extrabold text-xl">{t('manager.report.itemsSold')}</h3>
              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="h-10 px-4 rounded-full border-2 border-line bg-surface font-bold text-sm"
                >
                  {t('manager.report.print')}
                </button>
                {report.items.length > 0 && (
                  <button
                    onClick={exportCsv}
                    className="h-10 px-4 rounded-full border-2 border-ink bg-mint text-ink font-bold text-sm"
                  >
                    {t('manager.report.export')}
                  </button>
                )}
              </div>
            </div>

            {report.items.length === 0 ? (
              <p className="text-sm text-muted">{t('manager.report.noSales')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className="py-1 text-start font-semibold">{t('manager.report.item')}</th>
                    <th className="py-1 text-end font-semibold">{t('manager.report.qty')}</th>
                    <th className="py-1 text-end font-semibold">{t('manager.report.income')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr key={item.name} className="border-t border-soft-line">
                      <td className="py-2 font-semibold">{item.name}</td>
                      <td className="py-2 text-end">{item.quantity}</td>
                      <td className="py-2 text-end">{formatPrice(item.income)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {report.by_hour.length > 0 && (
            <div className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4">
              <h3 className="font-display font-extrabold text-xl mb-3">{t('manager.report.busiest')}</h3>
              <div className="flex flex-col gap-1.5">
                {report.by_hour.map((h) => (
                  <div key={h.hour} className="flex items-center gap-2 text-sm">
                    <span dir="ltr" className="w-12 text-muted">{pad(h.hour)}</span>
                    <div className="flex-1 bg-chip rounded-md">
                      <div
                        className="bg-brand dark:bg-pop h-5 rounded-md"
                        style={{ width: `${(h.orders / maxHourOrders) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-end font-bold">{h.orders}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="font-display text-2xl font-extrabold text-brand dark:text-pop">{value}</p>
    </div>
  )
}
