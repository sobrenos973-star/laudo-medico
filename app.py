from flask import Flask, render_template, request, send_file
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
import io

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/gerar', methods=['POST'])
def gerar_laudo():
    nome = request.form.get('nome')
    glicose = request.form.get('glicose')
    colesterol = request.form.get('colesterol')

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"<b>Laudo Bioquímico</b>", styles['Title']))
    elements.append(Spacer(1, 20))

    elements.append(Paragraph(f"<b>Paciente:</b> {nome}", styles['Normal']))
    elements.append(Spacer(1, 10))

    elements.append(Paragraph(f"<b>Resultados:</b>", styles['Heading2']))
    elements.append(Paragraph(f"Glicose: {glicose} mg/dL", styles['Normal']))
    elements.append(Paragraph(f"Colesterol Total: {colesterol} mg/dL", styles['Normal']))
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("<b>Referências:</b>", styles['Heading2']))
    elements.append(Paragraph("Glicose: 70 – 99 mg/dL", styles['Normal']))
    elements.append(Paragraph("Colesterol Total: < 200 mg/dL", styles['Normal']))

    doc.build(elements)

    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="laudo.pdf",
        mimetype='application/pdf'
    )


if __name__ == '__main__':
    app.run(debug=True)
