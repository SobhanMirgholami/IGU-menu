import JSZip from 'jszip'
import { pick } from './localize'

// Must match tools/make-excel-template.py
const TEMPLATE_VERSION = 'v3'
const TEMPLATE_URL = `/sales-report-template.xlsx?v=${TEMPLATE_VERSION}` // new URL = no stale browser cache

const SHEETS = [
  { file: 'xl/worksheets/sheet1.xml', name: 'Türkçe', lang: 'tr' },
  { file: 'xl/worksheets/sheet2.xml', name: 'English', lang: 'en' },
  { file: 'xl/worksheets/sheet3.xml', name: 'العربية', lang: 'ar' },
]

const KPI = { income: 'B5', orders: 'E5', average: 'H5', cancelled: 'K5' }
const HOUR_FIRST_ROW = 44 // 24 rows: 44..67
const HOUR_ROWS = 24
const ITEM_FIRST_ROW = 71 // 40 rows: 71..110
const ITEM_ROWS = 40
const CHART_ITEMS = 10 // item charts show the top 10

const escapeXml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const cellPattern = (ref) => new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)`)

// Writes a plain value into a cell, keeping its style (font, borders, number format)
function setCell(xml, ref, value) {
  const pattern = cellPattern(ref)
  if (!pattern.test(xml)) throw new Error(`Template cell ${ref} not found`)

  return xml.replace(pattern, (_, attrs) => {
    const style = attrs.replace(/\s*t="[^"]*"/, '')
    if (typeof value === 'number') return `<c r="${ref}"${style}><v>${value}</v></c>`
    return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
  })
}

// Keeps a cell's formula but stores its result too. Excel recalculates anyway,
// but phone apps and online previews only show this stored result.
function setFormulaResult(xml, ref, value) {
  const pattern = cellPattern(ref)
  if (!pattern.test(xml)) throw new Error(`Template cell ${ref} not found`)

  return xml.replace(pattern, (whole, attrs, inner = '') => {
    const formula = inner.match(/<f>[\s\S]*?<\/f>/)
    if (!formula) return whole
    return `<c r="${ref}"${attrs}>${formula[0]}<v>${value}</v></c>`
  })
}

function hideRow(xml, row) {
  return xml.replace(new RegExp(`<row r="${row}"(?![^>]*hidden)`), `<row r="${row}" hidden="1"`)
}

const pad = (n) => String(n).padStart(2, '0')
const round = (n) => Math.round(n * 100) / 100
const formatDateTime = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`

// Turns the report into the rows every sheet shows (same numbers, different language)
export function buildRows({ report, hourFrom = 0, hourTo = 24 }) {
  const byHour = new Map(report.by_hour.map((h) => [Number(h.hour), h]))
  const saleHours = [...byHour.keys()].filter((h) => h >= hourFrom && h < hourTo)

  // From the first to the last hour with sales, keeping quiet hours in between
  const hours = []
  if (saleHours.length) {
    for (let hour = Math.min(...saleHours); hour <= Math.max(...saleHours); hour++) {
      const data = byHour.get(hour)
      hours.push({
        label: `${pad(hour)}:00`,
        orders: data ? Number(data.orders) : 0,
        income: data ? Number(data.income) : 0,
      })
    }
  }

  const income = round(hours.reduce((sum, h) => sum + h.income, 0))
  const orders = hours.reduce((sum, h) => sum + h.orders, 0)

  return {
    hours: hours.slice(0, HOUR_ROWS),
    items: report.items.slice(0, ITEM_ROWS),
    income,
    orders,
    average: orders ? income / orders : 0,
    cancelled: Number(report.cancelled) || 0,
  }
}

export function fillSheet(xml, rows, sheet, { period, createdAt }) {
  const share = (value) => (rows.income ? value / rows.income : 0)

  xml = setCell(xml, 'C2', period)
  xml = setCell(xml, 'J2', formatDateTime(createdAt))

  xml = setFormulaResult(xml, KPI.income, rows.income)
  xml = setFormulaResult(xml, KPI.orders, rows.orders)
  xml = setFormulaResult(xml, KPI.average, rows.average)
  xml = setCell(xml, KPI.cancelled, rows.cancelled)

  for (let i = 0; i < HOUR_ROWS; i++) {
    const row = HOUR_FIRST_ROW + i
    const hour = rows.hours[i]
    if (!hour) {
      xml = hideRow(xml, row)
      continue
    }
    xml = setCell(xml, `B${row}`, hour.label)
    xml = setCell(xml, `C${row}`, hour.orders)
    xml = setCell(xml, `D${row}`, hour.income)
    xml = setFormulaResult(xml, `E${row}`, hour.orders ? hour.income / hour.orders : 0)
    xml = setFormulaResult(xml, `F${row}`, share(hour.income))
  }

  for (let i = 0; i < ITEM_ROWS; i++) {
    const row = ITEM_FIRST_ROW + i
    const item = rows.items[i]
    if (!item) {
      xml = hideRow(xml, row)
      continue
    }
    xml = setCell(xml, `B${row}`, pick(item.names, sheet.lang) || item.name)
    xml = setCell(xml, `E${row}`, Number(item.quantity))
    xml = setCell(xml, `F${row}`, Number(item.income))
    xml = setFormulaResult(xml, `G${row}`, share(Number(item.income)))
  }

  return xml
}

// ---- Charts: point each chart at exactly the rows that have data, and store
// the values inside the chart so every viewer can draw it ----

const strCache = (values) =>
  `<strCache><ptCount val="${values.length}"/>${values
    .map((v, i) => `<pt idx="${i}"><v>${escapeXml(v)}</v></pt>`)
    .join('')}</strCache>`

const numCache = (values) =>
  `<numCache><formatCode>General</formatCode><ptCount val="${values.length}"/>${values
    .map((v, i) => `<pt idx="${i}"><v>${v}</v></pt>`)
    .join('')}</numCache>`

const COLUMN_VALUES = {
  // hourly table
  [`hour:B`]: (rows) => rows.hours.map((h) => h.label),
  [`hour:C`]: (rows) => rows.hours.map((h) => h.orders),
  [`hour:D`]: (rows) => rows.hours.map((h) => h.income),
  // items table (top 10 only)
  [`item:B`]: (rows, lang) => rows.items.slice(0, CHART_ITEMS).map((it) => pick(it.names, lang) || it.name),
  [`item:E`]: (rows) => rows.items.slice(0, CHART_ITEMS).map((it) => Number(it.quantity)),
  [`item:F`]: (rows) => rows.items.slice(0, CHART_ITEMS).map((it) => Number(it.income)),
}

function rangeFor(sheetName, column, firstRow, count) {
  const last = firstRow + Math.max(count, 1) - 1
  return `'${sheetName}'!$${column}$${firstRow}:$${column}$${last}`
}

export function fillChart(xml, rowsBySheet) {
  const refPattern = /<(cat|val)><numRef><f>'([^']+)'!\$([A-Z]+)\$(\d+):\$[A-Z]+\$\d+<\/f><\/numRef><\/\1>/g
  let maxCount = 0
  let isCount = false

  const filled = xml.replace(refPattern, (whole, part, sheetName, column, firstRow) => {
    const sheet = rowsBySheet[sheetName]
    if (!sheet) return whole
    const table = Number(firstRow) === HOUR_FIRST_ROW ? 'hour' : 'item'
    const values = COLUMN_VALUES[`${table}:${column}`]?.(sheet.rows, sheet.lang) ?? []
    const f = `<f>${rangeFor(sheetName, column, Number(firstRow), values.length)}</f>`

    if (part === 'cat') return `<cat><strRef>${f}${strCache(values)}</strRef></cat>`
    if (column === 'C' || column === 'E') {
      isCount = true
      maxCount = Math.max(0, ...values)
    }
    return `<val><numRef>${f}${numCache(values)}</numRef></val>`
  })

  // Small order counts: step by 1 so the axis doesn't read 0, 0, 1, 1, 2...
  if (isCount && maxCount < 10) return filled.replace('</valAx>', '<majorUnit val="1"/></valAx>')
  return filled
}

export async function fillWorkbook(zip, data, openLang = 'tr') {
  const workbook = await zip.file('xl/workbook.xml').async('string')
  if (!workbook.includes(`"${TEMPLATE_VERSION}"`)) {
    throw new Error('Excel template is out of date. Refresh the page and try again.')
  }

  const rows = buildRows(data)
  const createdAt = data.createdAt ?? new Date()
  const rowsBySheet = {}

  for (const sheet of SHEETS) {
    const xml = await zip.file(sheet.file).async('string')
    let filled = fillSheet(xml, rows, sheet, { period: data.period, createdAt })
    if (sheet.lang === openLang) filled = filled.replace('<sheetView ', '<sheetView tabSelected="1" ')
    zip.file(sheet.file, filled)
    rowsBySheet[sheet.name] = { rows, lang: sheet.lang }
  }

  for (const path of Object.keys(zip.files).filter((p) => /^xl\/charts\/chart\d+\.xml$/.test(p))) {
    const xml = await zip.file(path).async('string')
    zip.file(path, fillChart(xml, rowsBySheet))
  }

  // Open the workbook on the sheet in the manager's language
  const activeTab = Math.max(0, SHEETS.findIndex((s) => s.lang === openLang))
  zip.file('xl/workbook.xml', workbook.replace(/activeTab="\d+"/, `activeTab="${activeTab}"`))

  return zip
}

export async function exportSalesExcel(data, { fileName, openLang }) {
  const response = await fetch(TEMPLATE_URL, { cache: 'no-cache' })
  if (!response.ok) throw new Error('Excel template not found')

  const zip = await JSZip.loadAsync(await response.arrayBuffer())
  await fillWorkbook(zip, data, openLang)

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
