"""
Builds public/sales-report-template.xlsx: the empty IGU Café sales dashboard.
The app (src/lib/exportExcel.js) fills it with real numbers when a manager exports.

Run:  python tools/make-excel-template.py public/sales-report-template.xlsx
If you change any row or column here, update the matching constants in exportExcel.js.
"""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.text import RichText
from openpyxl.drawing.text import Paragraph, ParagraphProperties, CharacterProperties, Font as DrawingFont
from openpyxl.drawing.line import LineProperties
from openpyxl.drawing.spreadsheet_drawing import TwoCellAnchor, AnchorMarker
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.pagebreak import Break

OUT = sys.argv[1] if len(sys.argv) > 1 else 'sales-report-template.xlsx'
TEMPLATE_VERSION = 'v3'   # the app refuses a template with a different version

# University colors
BRAND = '0B3D91'
BRAND_SOFT = 'EEF3FF'
POP = 'FFC93C'
GREEN = '1E9E6A'
RED = 'B33A1E'
INK = '0E1630'
MUTED = '5B6688'
LINE = 'D5DCEE'
STRIPE = 'F7F9FE'
WHITE = 'FFFFFF'

MONEY = '#,##0.00 "₺"'
MONEY_AXIS = '#,##0 "₺"'
COUNT = '#,##0'
PERCENT = '0.0%'

# ---- Layout (keep in sync with exportExcel.js) ----
FIRST_COL, LAST_COL = 2, 13          # B..M, column A is a thin margin
KPI_LABEL_ROW, KPI_VALUE_ROW = 4, 5
KPI_TILES = ['B', 'E', 'H', 'K']     # each tile is 3 columns wide
CHART_ROWS = [(8, 23), (25, 40)]     # two rows of charts
HOUR_TITLE = 42
HOUR_HEAD = 43
HOUR_FIRST, HOUR_LAST = 44, 67       # 24 rows, filled from the top
ITEM_TITLE = 69
ITEM_HEAD = 70
ITEM_FIRST, ITEM_LAST = 71, 110      # 40 rows, filled from the top

LABELS = {
    'Türkçe': dict(
        title='IGU Café · Satış raporu', period='Dönem', created='Oluşturuldu',
        income='Toplam gelir', orders='Sipariş', average='Ortalama sipariş', cancelled='İptal edilen',
        charts='Grafikler', hourly='Saatlik satışlar', hour='Saat', count='Sipariş', money='Gelir',
        avg='Ort. sipariş', share='Pay %', items='Satılan ürünler', item='Ürün', qty='Adet',
        c1='Saatlere göre siparişler', c2='Saatlere göre gelir',
        c3='En çok satanlar (adet, ilk 10)', c4='Ürünlere göre gelir (ilk 10)', rtl=False),
    'English': dict(
        title='IGU Café · Sales report', period='Period', created='Created',
        income='Total income', orders='Orders', average='Average order', cancelled='Cancelled',
        charts='Charts', hourly='Sales by hour', hour='Hour', count='Orders', money='Income',
        avg='Avg. order', share='Share %', items='Items sold', item='Item', qty='Qty',
        c1='Orders by hour', c2='Income by hour',
        c3='Best sellers (qty, top 10)', c4='Income by item (top 10)', rtl=False),
    'العربية': dict(
        title='IGU Café · تقرير المبيعات', period='الفترة', created='تاريخ الإنشاء',
        income='إجمالي الدخل', orders='الطلبات', average='متوسط الطلب', cancelled='الملغاة',
        charts='الرسوم البيانية', hourly='المبيعات حسب الساعة', hour='الساعة', count='الطلبات',
        money='الدخل', avg='متوسط الطلب', share='الحصة %', items='المنتجات المباعة',
        item='المنتج', qty='الكمية',
        c1='الطلبات حسب الساعة', c2='الدخل حسب الساعة',
        c3='الأكثر مبيعًا (الكمية، أفضل 10)', c4='الدخل حسب المنتج (أفضل 10)', rtl=True),
}

FONT = 'Arial'
def font(size=10, bold=False, color=INK):
    return Font(name=FONT, size=size, bold=bold, color=color)

def fill(color):
    return PatternFill('solid', fgColor=color)

thin = Side(style='thin', color=LINE)
GRID = Border(top=thin, bottom=thin, left=thin, right=thin)
BOTTOM = Border(bottom=thin)
LEFT = Alignment(horizontal='left', vertical='center', indent=1)
RIGHT = Alignment(horizontal='right', vertical='center', indent=1)
CENTER = Alignment(horizontal='center', vertical='center')


def col(n):
    return chr(ord('A') + n - 1)


def style_range(ws, cells, **attrs):
    for row in ws[cells]:
        for c in row:
            for key, value in attrs.items():
                setattr(c, key, value)


def chart_text(size=9, bold=False, color=MUTED):
    """Arial text for chart titles and axes."""
    props = CharacterProperties(latin=DrawingFont(typeface=FONT), sz=size * 100, b=bold, solidFill=color)
    return RichText(p=[Paragraph(pPr=ParagraphProperties(defRPr=props), endParaRPr=props)])


def finish_chart(chart, title):
    chart.title = title
    chart.title.overlay = False          # title sits above the plot, never on top of it
    chart.auto_title_deleted = False
    chart.title.tx.rich.p[0].pPr = ParagraphProperties(
        defRPr=CharacterProperties(latin=DrawingFont(typeface=FONT), sz=1200, b=True, solidFill=INK))
    chart.legend = None
    chart.x_axis.delete = False
    chart.y_axis.delete = False
    chart.x_axis.txPr = chart_text()
    chart.y_axis.txPr = chart_text()
    chart.x_axis.majorTickMark = 'none'
    chart.y_axis.majorTickMark = 'none'
    chart.y_axis.majorGridlines.spPr = GraphicalProperties(ln=LineProperties(solidFill=LINE))
    chart.y_axis.spPr = GraphicalProperties(ln=LineProperties(noFill=True))
    chart.x_axis.spPr = GraphicalProperties(ln=LineProperties(solidFill=LINE))
    chart.graphical_properties = GraphicalProperties(ln=LineProperties(solidFill=LINE))


def value_labels(series, number_format):
    series.dLbls = DataLabelList()
    series.dLbls.showVal = True
    for flag in ('showSerName', 'showCatName', 'showLegendKey', 'showPercent'):
        setattr(series.dLbls, flag, False)
    series.dLbls.numFmt = number_format
    series.dLbls.txPr = chart_text(8, True, INK)


def place(ws, chart, first_col, first_row, last_col, last_row):
    """Pin a chart between two cells, so right-to-left sheets mirror it correctly."""
    anchor = TwoCellAnchor()
    anchor._from = AnchorMarker(col=first_col - 1, row=first_row - 1)
    anchor.to = AnchorMarker(col=last_col, row=last_row)
    chart.anchor = anchor
    ws.add_chart(chart)


def section(ws, row, text):
    ws[f'B{row}'] = text
    ws[f'B{row}'].font = font(12, True, BRAND)
    ws.row_dimensions[row].height = 22
    style_range(ws, f'B{row}:M{row}', border=Border(bottom=Side(style='medium', color=BRAND)))


def header(ws, row, cells):
    for ref, text, align in cells:
        ws[ref] = text
    style_range(ws, f'B{row}:{cells[-1][0][0]}{row}', font=font(9, True, WHITE), fill=fill(BRAND), alignment=CENTER)
    for ref, _, align in cells:
        ws[ref].alignment = align
    ws.row_dimensions[row].height = 20


wb = Workbook()
wb.remove(wb.active)

for sheet_name, L in LABELS.items():
    ws = wb.create_sheet(sheet_name)
    ws.sheet_view.rightToLeft = L['rtl']
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 100
    ws.column_dimensions['A'].width = 2
    for n in range(FIRST_COL, LAST_COL + 1):
        ws.column_dimensions[col(n)].width = 12
    ws.column_dimensions['N'].width = 2

    # ---- Title band ----
    ws.merge_cells('B1:M1')
    ws['B1'] = L['title']
    style_range(ws, 'B1:M1', fill=fill(BRAND))
    ws['B1'].font = font(18, True, WHITE)
    ws['B1'].alignment = LEFT
    ws.row_dimensions[1].height = 40

    # ---- Period and created date (filled by the app) ----
    ws['B2'] = L['period']
    ws['B2'].font = font(9, True, MUTED)
    ws['B2'].alignment = LEFT
    ws.merge_cells('C2:G2')
    ws['C2'].font = font(10, True)
    ws['C2'].alignment = LEFT
    ws.merge_cells('H2:I2')
    ws['H2'] = L['created']
    ws['H2'].font = font(9, True, MUTED)
    ws['H2'].alignment = RIGHT
    ws.merge_cells('J2:M2')
    ws['J2'].font = font(10)
    ws['J2'].alignment = LEFT
    ws.row_dimensions[2].height = 22
    ws.row_dimensions[3].height = 8

    # ---- KPI tiles: label on top, big number below ----
    kpis = [
        (L['income'], f'=SUM(D{HOUR_FIRST}:D{HOUR_LAST})', MONEY, BRAND),
        (L['orders'], f'=SUM(C{HOUR_FIRST}:C{HOUR_LAST})', COUNT, INK),
        (L['average'], f'=IFERROR(B{KPI_VALUE_ROW}/E{KPI_VALUE_ROW},0)', MONEY, GREEN),
        (L['cancelled'], 0, COUNT, RED),        # plain number, filled by the app
    ]
    for start, (label, value, fmt, color) in zip(KPI_TILES, kpis):
        end = col(ord(start) - ord('A') + 3)
        ws.merge_cells(f'{start}{KPI_LABEL_ROW}:{end}{KPI_LABEL_ROW}')
        ws.merge_cells(f'{start}{KPI_VALUE_ROW}:{end}{KPI_VALUE_ROW}')
        ws[f'{start}{KPI_LABEL_ROW}'] = label
        ws[f'{start}{KPI_VALUE_ROW}'] = value
        side = Side(style='medium', color=color)
        style_range(ws, f'{start}{KPI_LABEL_ROW}:{end}{KPI_LABEL_ROW}', fill=fill(BRAND_SOFT),
                    border=Border(top=side))
        style_range(ws, f'{start}{KPI_VALUE_ROW}:{end}{KPI_VALUE_ROW}', fill=fill(BRAND_SOFT),
                    border=Border(bottom=thin))
        ws[f'{start}{KPI_LABEL_ROW}'].font = font(9, True, MUTED)
        ws[f'{start}{KPI_LABEL_ROW}'].alignment = LEFT
        ws[f'{start}{KPI_VALUE_ROW}'].font = font(20, True, color)
        ws[f'{start}{KPI_VALUE_ROW}'].alignment = LEFT
        ws[f'{start}{KPI_VALUE_ROW}'].number_format = fmt
    ws.row_dimensions[KPI_LABEL_ROW].height = 22
    ws.row_dimensions[KPI_VALUE_ROW].height = 38

    # Gaps between tiles: white columns would need extra columns, so the tiles
    # touch and the colored top border separates them visually.

    section(ws, 7, L['charts'])

    # ---- Hourly table ----
    section(ws, HOUR_TITLE, L['hourly'])
    header(ws, HOUR_HEAD, [
        (f'B{HOUR_HEAD}', L['hour'], LEFT), (f'C{HOUR_HEAD}', L['count'], RIGHT),
        (f'D{HOUR_HEAD}', L['money'], RIGHT), (f'E{HOUR_HEAD}', L['avg'], RIGHT),
        (f'F{HOUR_HEAD}', L['share'], RIGHT)])
    for i, row in enumerate(range(HOUR_FIRST, HOUR_LAST + 1)):
        ws[f'E{row}'] = f'=IFERROR(D{row}/C{row},0)'
        ws[f'F{row}'] = f'=IFERROR(D{row}/$B${KPI_VALUE_ROW},0)'
        formats = {'B': 'General', 'C': COUNT, 'D': MONEY, 'E': MONEY, 'F': PERCENT}
        for c, fmt in formats.items():
            cell = ws[f'{c}{row}']
            cell.font = font(10, c == 'D')
            cell.number_format = fmt
            cell.alignment = LEFT if c == 'B' else RIGHT
            cell.border = BOTTOM
            if i % 2:
                cell.fill = fill(STRIPE)
        ws.row_dimensions[row].height = 18

    # ---- Items table ----
    section(ws, ITEM_TITLE, L['items'])
    ws.merge_cells(f'B{ITEM_HEAD}:D{ITEM_HEAD}')
    header(ws, ITEM_HEAD, [
        (f'B{ITEM_HEAD}', L['item'], LEFT), (f'E{ITEM_HEAD}', L['qty'], RIGHT),
        (f'F{ITEM_HEAD}', L['money'], RIGHT), (f'G{ITEM_HEAD}', L['share'], RIGHT)])
    for i, row in enumerate(range(ITEM_FIRST, ITEM_LAST + 1)):
        ws.merge_cells(f'B{row}:D{row}')
        ws[f'G{row}'] = f'=IFERROR(F{row}/$B${KPI_VALUE_ROW},0)'
        formats = {'B': 'General', 'C': 'General', 'D': 'General', 'E': COUNT, 'F': MONEY, 'G': PERCENT}
        for c, fmt in formats.items():
            cell = ws[f'{c}{row}']
            cell.font = font(10, c == 'F')
            cell.number_format = fmt
            cell.alignment = LEFT if c == 'B' else RIGHT
            cell.border = BOTTOM
            if i % 2:
                cell.fill = fill(STRIPE)
        ws.row_dimensions[row].height = 18

    # ---- Charts (ranges are trimmed to the real data by the app) ----
    hours = Reference(ws, min_col=2, min_row=HOUR_FIRST, max_row=HOUR_LAST)
    items = Reference(ws, min_col=2, min_row=ITEM_FIRST, max_row=ITEM_FIRST + 9)

    c1 = BarChart()
    c1.type = 'col'
    c1.add_data(Reference(ws, min_col=3, min_row=HOUR_HEAD, max_row=HOUR_LAST), titles_from_data=True)
    c1.set_categories(hours)
    c1.series[0].graphicalProperties = GraphicalProperties(solidFill=BRAND, ln=LineProperties(noFill=True))
    value_labels(c1.series[0], COUNT)
    c1.gapWidth = 40
    c1.y_axis.number_format = COUNT
    finish_chart(c1, L['c1'])

    c2 = LineChart()
    c2.add_data(Reference(ws, min_col=4, min_row=HOUR_HEAD, max_row=HOUR_LAST), titles_from_data=True)
    c2.set_categories(hours)
    s = c2.series[0]
    s.graphicalProperties = GraphicalProperties(ln=LineProperties(solidFill=GREEN, w=34925))
    s.marker.symbol = 'circle'
    s.marker.size = 7
    s.marker.graphicalProperties = GraphicalProperties(solidFill=WHITE, ln=LineProperties(solidFill=GREEN, w=22225))
    s.smooth = False
    c2.y_axis.number_format = MONEY_AXIS
    finish_chart(c2, L['c2'])

    c3 = BarChart()
    c3.type = 'bar'
    c3.add_data(Reference(ws, min_col=5, min_row=ITEM_HEAD, max_row=ITEM_FIRST + 9), titles_from_data=True)
    c3.set_categories(items)
    c3.series[0].graphicalProperties = GraphicalProperties(solidFill=POP, ln=LineProperties(noFill=True))
    value_labels(c3.series[0], COUNT)
    c3.gapWidth = 40
    c3.x_axis.scaling.orientation = 'maxMin'     # best seller on top
    c3.y_axis.crosses = 'max'                    # ...and keep the numbers at the bottom, away from the title
    c3.y_axis.number_format = COUNT
    finish_chart(c3, L['c3'])

    c4 = BarChart()
    c4.type = 'bar'
    c4.add_data(Reference(ws, min_col=6, min_row=ITEM_HEAD, max_row=ITEM_FIRST + 9), titles_from_data=True)
    c4.set_categories(items)
    c4.series[0].graphicalProperties = GraphicalProperties(solidFill=GREEN, ln=LineProperties(noFill=True))
    value_labels(c4.series[0], MONEY_AXIS)
    c4.gapWidth = 40
    c4.x_axis.scaling.orientation = 'maxMin'
    c4.y_axis.crosses = 'max'
    c4.y_axis.number_format = MONEY_AXIS
    finish_chart(c4, L['c4'])

    (top1, bottom1), (top2, bottom2) = CHART_ROWS
    place(ws, c1, 2, top1, 7, bottom1)     # B8:G23
    place(ws, c2, 8, top1, 13, bottom1)    # H8:M23
    place(ws, c3, 2, top2, 7, bottom2)     # B25:G40
    place(ws, c4, 8, top2, 13, bottom2)    # H25:M40

    # ---- Printing: one page wide, dashboard on page 1 ----
    ws.page_setup.orientation = 'portrait'
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_options.horizontalCentered = True
    ws.row_breaks.append(Break(id=HOUR_TITLE - 1))   # page 1: dashboard, then the tables
    ws.page_margins.left = ws.page_margins.right = 0.4
    ws.page_margins.top = ws.page_margins.bottom = 0.5

wb.defined_names['TEMPLATE_VERSION'] = DefinedName('TEMPLATE_VERSION', attr_text=f'"{TEMPLATE_VERSION}"')
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print('saved', OUT)
