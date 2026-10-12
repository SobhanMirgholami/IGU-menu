import JSZip from 'jszip'
import { pick } from './localize'

// Layout of public/sales-report-template.xlsx (see the template's sheets)
const SHEETS = [
  { file: 'xl/worksheets/sheet1.xml', lang: 'tr' },
  { file: 'xl/worksheets/sheet2.xml', lang: 'en' },
  { file: 'xl/worksheets/sheet3.xml', lang: 'ar' },
]
const HOUR_FIRST_ROW = 47 // 00:00 is row 47, 23:00 is row 70 (rows 10-43 hold the charts)
const ITEM_FIRST_ROW = 74
const ITEM_ROWS = 40

const escapeXml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Replaces one cell's value, keeping its style (borders, number format)
function setCell(xml, ref, value) {
  const pattern = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`)
  if (!pattern.test(xml)) throw new Error(`Template cell ${ref} not found`)

  return xml.replace(pattern, (_, attrs) => {
    const style = attrs.replace(/\s*t="[^"]*"/, '')
    if (typeof value === 'number') return `<c r="${ref}"${style}><v>${value}</v></c>`
    return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
  })
}

// Hidden rows are skipped by the charts, so empty hours and items don't show
function hideRow(xml, row) {
  return xml.replace(new RegExp(`<row r="${row}"(?![^>]*hidden)`), `<row r="${row}" hidden="1"`)
}

export function fillSheet(xml, { report, period, hourFrom, hourTo }, lang) {
  xml = setCell(xml, 'B2', period)
  xml = setCell(xml, 'B8', Number(report.cancelled))

  // Show hours from the first to the last sale (inside the chosen range)
  const byHour = new Map(report.by_hour.map((h) => [h.hour, h]))
  const saleHours = report.by_hour.map((h) => h.hour)
  const firstHour = saleHours.length ? Math.max(hourFrom, Math.min(...saleHours)) : hourFrom
  const lastHour = saleHours.length ? Math.min(hourTo - 1, Math.max(...saleHours)) : hourTo - 1

  for (let hour = 0; hour < 24; hour++) {
    const row = HOUR_FIRST_ROW + hour
    const data = byHour.get(hour)
    xml = setCell(xml, `B${row}`, data ? Number(data.orders) : 0)
    xml = setCell(xml, `C${row}`, data ? Number(data.income) : 0)
    if (hour < firstHour || hour > lastHour) xml = hideRow(xml, row)
  }

  const items = report.items.slice(0, ITEM_ROWS)
  for (let i = 0; i < ITEM_ROWS; i++) {
    const row = ITEM_FIRST_ROW + i
    const item = items[i]
    if (item) {
      xml = setCell(xml, `A${row}`, pick(item.names, lang) || item.name)
      xml = setCell(xml, `B${row}`, Number(item.quantity))
      xml = setCell(xml, `C${row}`, Number(item.income))
    } else {
      xml = hideRow(xml, row)
    }
  }

  return xml
}

export async function fillWorkbook(zip, data, openLang = 'tr') {
  for (const sheet of SHEETS) {
    const xml = await zip.file(sheet.file).async('string')
    let filled = fillSheet(xml, data, sheet.lang)
    if (sheet.lang === openLang) filled = filled.replace('<sheetView ', '<sheetView tabSelected="1" ')
    zip.file(sheet.file, filled)
  }

  // Open the workbook on the sheet in the manager's language
  const activeTab = Math.max(0, SHEETS.findIndex((s) => s.lang === openLang))
  const workbook = await zip.file('xl/workbook.xml').async('string')
  zip.file('xl/workbook.xml', workbook.replace(/activeTab="\d+"/, `activeTab="${activeTab}"`))

  return zip
}

export async function exportSalesExcel(data, { fileName, openLang }) {
  const response = await fetch('/sales-report-template.xlsx')
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
