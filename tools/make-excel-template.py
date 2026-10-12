from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.drawing.spreadsheet_drawing import TwoCellAnchor, AnchorMarker
import sys

OUT = sys.argv[1]

BRAND = '0B3D91'
BRAND_SOFT = 'DCE6FF'
POP = 'FFC93C'
INK = '0E1630'
MONEY = '#,##0.00 "₺"'
MONEY_AXIS = '#,##0 "₺"'
GREEN = '1E9E6A'

LABELS = {
    'Türkçe': dict(title='IGU Café · Satış raporu', period='Dönem', summary='Özet', income='Gelir',
                   orders='Sipariş sayısı', average='Ortalama sipariş', cancelled='İptal edilen',
                   hourly='Saatlik satışlar', hour='Saat', count='Sipariş', items='Satılan ürünler',
                   item='Ürün', qty='Adet', chart1='Saatlere göre siparişler', chart2='En çok satan ürünler (adet)',
                   chart3='Saatlere göre gelir', chart4='Ürünlere göre gelir', charts='Grafikler',
                   rtl=False),
    'English': dict(title='IGU Café · Sales report', period='Period', summary='Summary', income='Income',
                    orders='Orders', average='Average order', cancelled='Cancelled',
                    hourly='Sales by hour', hour='Hour', count='Orders', items='Items sold',
                    item='Item', qty='Qty', chart1='Orders by hour', chart2='Best-selling items (qty)',
                    chart3='Income by hour', chart4='Income by item', charts='Charts',
                    rtl=False),
    'العربية': dict(title='IGU Café · تقرير المبيعات', period='الفترة', summary='الملخص', income='الدخل',
                    orders='عدد الطلبات', average='متوسط الطلب', cancelled='الملغاة',
                    hourly='المبيعات حسب الساعة', hour='الساعة', count='الطلبات', items='المنتجات المباعة',
                    item='المنتج', qty='الكمية', chart1='الطلبات حسب الساعة', chart2='المنتجات الأكثر مبيعًا (الكمية)',
                    chart3='الدخل حسب الساعة', chart4='الدخل حسب المنتج', charts='الرسوم البيانية',
                    rtl=True),
}

# Rows 10-43 hold the 2x2 chart grid. The tables sit below it, because hiding
# a row moves everything under it up: a chart anchored below a hidden row would slide.
HOUR_TITLE = 45
HOUR_HEAD = HOUR_TITLE + 1
HOUR_FIRST, HOUR_LAST = HOUR_HEAD + 1, HOUR_HEAD + 24      # 00:00 .. 23:00
ITEM_TITLE = HOUR_LAST + 2
ITEM_HEAD = ITEM_TITLE + 1
ITEM_FIRST, ITEM_LAST = ITEM_HEAD + 1, ITEM_HEAD + 40     # up to 40 items

thin = Side(style='thin', color='C9D2EA')
cell_border = Border(top=thin, bottom=thin, left=thin, right=thin)
base_font = Font(name='Arial', size=10, color=INK)
bold_font = Font(name='Arial', size=10, bold=True, color=INK)
section_font = Font(name='Arial', size=12, bold=True, color=BRAND)
header_fill = PatternFill('solid', fgColor=BRAND_SOFT)


def place(ws, chart, col1, row1, col2, row2):
    """Pin a chart between two cells (0-based col/row). Both corners are fixed,
    so right-to-left sheets mirror it correctly."""
    anchor = TwoCellAnchor()
    anchor._from = AnchorMarker(col=col1, row=row1)
    anchor.to = AnchorMarker(col=col2, row=row2)
    chart.anchor = anchor
    ws.add_chart(chart)

wb = Workbook()
wb.remove(wb.active)

for sheet_name, L in LABELS.items():
    ws = wb.create_sheet(sheet_name)
    ws.sheet_view.rightToLeft = L['rtl']
    ws.sheet_view.showGridLines = False
    ws.column_dimensions['A'].width = 28
    ws.column_dimensions['B'].width = 14
    ws.column_dimensions['C'].width = 16
    ws.column_dimensions['D'].width = 3

    # Title and period
    ws.merge_cells('A1:C1')
    ws['A1'] = L['title']
    ws['A1'].font = Font(name='Arial', size=14, bold=True, color='FFFFFF')
    ws['A1'].fill = PatternFill('solid', fgColor=BRAND)
    ws['A1'].alignment = Alignment(horizontal='left', vertical='center', indent=1)
    ws.row_dimensions[1].height = 28

    ws['A2'] = L['period']
    ws['A2'].font = bold_font
    ws.merge_cells('B2:C2')
    ws['B2'].font = base_font          # filled by the app
    ws['B2'].border = cell_border

    # Summary: totals are formulas over the hourly table
    ws['A4'] = L['summary']
    ws['A4'].font = section_font
    summary = [
        (5, L['income'], f'=SUM(C{HOUR_FIRST}:C{HOUR_LAST})', MONEY),
        (6, L['orders'], f'=SUM(B{HOUR_FIRST}:B{HOUR_LAST})', '0'),
        (7, L['average'], '=IFERROR(B5/B6,0)', MONEY),
        (8, L['cancelled'], 0, '0'),    # filled by the app
    ]
    for row, label, value, fmt in summary:
        ws[f'A{row}'] = label
        ws[f'A{row}'].font = base_font
        ws[f'A{row}'].border = cell_border
        ws[f'B{row}'] = value
        ws[f'B{row}'].number_format = fmt
        ws[f'B{row}'].font = bold_font
        ws[f'B{row}'].border = cell_border

    # Hourly table
    ws[f'A{HOUR_TITLE}'] = L['hourly']
    ws[f'A{HOUR_TITLE}'].font = section_font
    for col, text in zip('ABC', [L['hour'], L['count'], L['income']]):
        c = ws[f'{col}{HOUR_HEAD}']
        c.value = text
        c.font = bold_font
        c.fill = header_fill
        c.border = cell_border
    for i, row in enumerate(range(HOUR_FIRST, HOUR_LAST + 1)):
        ws[f'A{row}'] = f'{i:02d}:00'
        ws[f'A{row}'].font = base_font
        ws[f'B{row}'] = 0
        ws[f'B{row}'].number_format = '0'
        ws[f'C{row}'] = 0
        ws[f'C{row}'].number_format = MONEY
        for col in 'ABC':
            ws[f'{col}{row}'].border = cell_border
            if col != 'A':
                ws[f'{col}{row}'].font = base_font

    # Items table
    ws[f'A{ITEM_TITLE}'] = L['items']
    ws[f'A{ITEM_TITLE}'].font = section_font
    for col, text in zip('ABC', [L['item'], L['qty'], L['income']]):
        c = ws[f'{col}{ITEM_HEAD}']
        c.value = text
        c.font = bold_font
        c.fill = header_fill
        c.border = cell_border
    for row in range(ITEM_FIRST, ITEM_LAST + 1):
        ws[f'A{row}'].font = base_font
        ws[f'B{row}'].number_format = '0'
        ws[f'B{row}'].font = base_font
        ws[f'C{row}'].number_format = MONEY
        ws[f'C{row}'].font = base_font
        for col in 'ABC':
            ws[f'{col}{row}'].border = cell_border

    ws['A10'] = L['charts']
    ws['A10'].font = section_font

    def style_axes(chart):
        chart.legend = None
        chart.x_axis.delete = False
        chart.y_axis.delete = False
        chart.width, chart.height = 15, 8

    hours = Reference(ws, min_col=1, min_row=HOUR_FIRST, max_row=HOUR_LAST)
    items = Reference(ws, min_col=1, min_row=ITEM_FIRST, max_row=ITEM_LAST)

    # 1. Orders by hour (columns)
    c1 = BarChart()
    c1.type = 'col'
    c1.title = L['chart1']
    style_axes(c1)
    c1.y_axis.title = L['count']
    c1.y_axis.majorGridlines = None
    c1.add_data(Reference(ws, min_col=2, min_row=HOUR_HEAD, max_row=HOUR_LAST), titles_from_data=True)
    c1.set_categories(hours)
    c1.series[0].graphicalProperties = GraphicalProperties(solidFill=BRAND)
    c1.series[0].graphicalProperties.line.solidFill = INK
    c1.gapWidth = 60
    place(ws, c1, 0, 10, 6, 26)    # A11:F26

    # 2. Income by hour (line with dots)
    c2 = LineChart()
    c2.title = L['chart3']
    style_axes(c2)
    c2.y_axis.title = L['income']
    c2.y_axis.number_format = MONEY_AXIS
    c2.add_data(Reference(ws, min_col=3, min_row=HOUR_HEAD, max_row=HOUR_LAST), titles_from_data=True)
    c2.set_categories(hours)
    line = c2.series[0]
    line.graphicalProperties.line.solidFill = GREEN
    line.graphicalProperties.line.width = 32000
    line.marker.symbol = 'circle'
    line.marker.size = 7
    line.marker.graphicalProperties = GraphicalProperties(solidFill=POP)
    line.marker.graphicalProperties.line.solidFill = INK
    line.smooth = False
    place(ws, c2, 6, 10, 15, 26)   # G11:O26

    # 3. Best-selling items by quantity (bars)
    c3 = BarChart()
    c3.type = 'bar'
    c3.title = L['chart2']
    style_axes(c3)
    c3.y_axis.majorGridlines = None
    c3.x_axis.scaling.orientation = 'maxMin'   # first item on top
    c3.add_data(Reference(ws, min_col=2, min_row=ITEM_HEAD, max_row=ITEM_LAST), titles_from_data=True)
    c3.set_categories(items)
    c3.series[0].graphicalProperties = GraphicalProperties(solidFill=POP)
    c3.series[0].graphicalProperties.line.solidFill = INK
    c3.gapWidth = 50
    place(ws, c3, 0, 27, 6, 43)    # A28:F43

    # 4. Income by item (bars)
    c4 = BarChart()
    c4.type = 'bar'
    c4.title = L['chart4']
    style_axes(c4)
    c4.y_axis.majorGridlines = None
    c4.y_axis.number_format = MONEY_AXIS
    c4.x_axis.scaling.orientation = 'maxMin'
    c4.add_data(Reference(ws, min_col=3, min_row=ITEM_HEAD, max_row=ITEM_LAST), titles_from_data=True)
    c4.set_categories(items)
    c4.series[0].graphicalProperties = GraphicalProperties(solidFill=GREEN)
    c4.series[0].graphicalProperties.line.solidFill = INK
    c4.gapWidth = 50
    place(ws, c4, 6, 27, 15, 43)   # G28:O43

    ws.page_setup.orientation = 'landscape'
    ws.page_setup.fitToWidth = 1
    ws.sheet_properties.pageSetUpPr.fitToPage = True

wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print('saved', OUT)
