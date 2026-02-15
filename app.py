from flask import Flask, render_template, request, send_file
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
import io

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/gerar-pdf', methods=['POST'])
def gerar_pdf():
    data = request.get_json(silent=True) or {}
    header = data.get('header', [])
    exams = data.get('exams', {})
    category_order = data.get('category_order', [])
    generated_at = data.get('generated_at', '')

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title='Laudo Laboratorial'
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1f3b5a'),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle('SubtitleStyle', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#4a5f73'))
    group_style = ParagraphStyle('GroupStyle', parent=styles['Heading2'], fontSize=11, textColor=colors.HexColor('#1f3b5a'), spaceBefore=8, spaceAfter=5)
    exam_style = ParagraphStyle('ExamStyle', parent=styles['Heading3'], fontSize=10, textColor=colors.HexColor('#2b5f87'), spaceAfter=4)

    elements = [
        Paragraph('LAUDO LABORATORIAL - UPA', title_style),
        Paragraph('Sistema Único de Saúde (SUS)', subtitle_style),
        Spacer(1, 8),
    ]

    if header:
        elements.append(Paragraph('Identificação do Paciente', styles['Heading2']))
        header_rows = [[f"<b>{item.get('label', '')}:</b>", item.get('value', '')] for item in header if item.get('value')]
        if header_rows:
            header_table = Table(header_rows, colWidths=[48 * mm, 120 * mm])
            header_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(header_table)
            elements.append(Spacer(1, 8))

    rendered_any_exam = False
    for category in category_order:
        group_exams = exams.get(category, [])
        if not group_exams:
            continue

        rendered_any_exam = True
        elements.append(Paragraph(category, group_style))

        for exam in group_exams:
            rows = exam.get('rows', [])
            if not rows:
                continue

            elements.append(Paragraph(exam.get('title', 'Exame'), exam_style))
            table_rows = [['Parâmetro', 'Resultado', 'Referência', 'Status']]
            for row in rows:
                table_rows.append([
                    row.get('param', ''),
                    row.get('result', ''),
                    row.get('ref', ''),
                    row.get('status', '')
                ])

            exam_table = Table(table_rows, colWidths=[40 * mm, 28 * mm, 88 * mm, 20 * mm], repeatRows=1)
            exam_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#eef3fb')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f3b5a')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cfd8e3')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))

            elements.append(exam_table)
            elements.append(Spacer(1, 6))

    if not rendered_any_exam:
        elements.append(Paragraph('Nenhum exame preenchido.', styles['Normal']))

    if generated_at:
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(generated_at, subtitle_style))

    doc.build(elements)
    buffer.seek(0)

    return send_file(buffer, mimetype='application/pdf', as_attachment=False, download_name='laudo-laboratorial.pdf')


if __name__ == '__main__':
    app.run(debug=True)
