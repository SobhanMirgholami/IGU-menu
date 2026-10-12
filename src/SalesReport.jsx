import { useEffect, useState } from 'react'
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
  { label: 'Today', from: today, to: today },
  { label: 'Last 7 days', from: () => daysAgo(6), to: today },
  { label: 'This month', from: firstOfMonth, to: today },
]

const HOURS = Array.from({ length: 25 }, (_, i) => i)

const pad = (hour) => String(hour).padStart(2, '0') + ':00'

export default function SalesReport() {
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
    const rows = [
      ['Report', `${from} to ${to}, ${pad(hourFrom)}-${pad(hourTo)}`],
      ['Income', report.income],
      ['Orders', report.orders],
      ['Average order', report.average],
      ['Cancelled', report.cancelled],
      [],
      ['Item', 'Quantity', 'Income'],
      ...report.items.map((item) => [item.name, item.quantity, item.income]),
    ]

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `sales-${from}-to-${to}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const maxHourOrders = Math.max(1, ...(report?.by_hour ?? []).map((h) => h.orders))

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1 rounded-full border text-sm"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            From
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-full border rounded-lg p-2" />
          </label>
          <label className="text-sm">
            To
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-full border rounded-lg p-2" />
          </label>
          <label className="text-sm">
            Start hour
            <select value={hourFrom} onChange={(e) => setHourFrom(e.target.value)} className="w-full border rounded-lg p-2">
              {HOURS.slice(0, 24).map((h) => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            End hour
            <select value={hourTo} onChange={(e) => setHourTo(e.target.value)} className="w-full border rounded-lg p-2">
              {HOURS.slice(1).map((h) => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={() => loadReport()}
          disabled={loading}
          className="w-full bg-amber-700 text-white rounded-lg p-2 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Show report'}
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Income" value={formatPrice(report.income)} />
            <Stat label="Orders" value={report.orders} />
            <Stat label="Average order" value={formatPrice(report.average)} />
            <Stat label="Cancelled" value={report.cancelled} />
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-amber-800">Items sold</h3>
              {report.items.length > 0 && (
                <button onClick={exportCsv} className="text-sm px-3 py-1 rounded border">
                  Export to Excel
                </button>
              )}
            </div>

            {report.items.length === 0 ? (
              <p className="text-sm text-gray-500">No sales in this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-right">Qty</th>
                    <th className="py-1 text-right">Income</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr key={item.name} className="border-t">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{formatPrice(item.income)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {report.by_hour.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-amber-800 mb-3">Busiest hours</h3>
              <div className="space-y-1">
                {report.by_hour.map((h) => (
                  <div key={h.hour} className="flex items-center gap-2 text-sm">
                    <span className="w-12 text-gray-500">{pad(h.hour)}</span>
                    <div className="flex-1 bg-amber-50 rounded">
                      <div
                        className="bg-amber-600 h-5 rounded"
                        style={{ width: `${(h.orders / maxHourOrders) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right">{h.orders}</span>
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
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-amber-800">{value}</p>
    </div>
  )
}