(function () {
    const headerInputs = Array.from(document.querySelectorAll('[data-header-field]'));
    const examCards = Array.from(document.querySelectorAll('.exam-card'));
    const generateBtn = document.getElementById('generate-pdf');

    const formatDateBR = (date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const formatTimeBR = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const toISODate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const toNumber = (value) => {
        if (!value) return null;
        const matched = String(value).match(/-?\d+[\d.,]*/);
        if (!matched) return null;

        let raw = matched[0].replace(/\s/g, '');
        if (raw.includes('.') && raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.');
        else if (raw.includes(',') && !raw.includes('.')) raw = raw.replace(',', '.');
        else if (raw.includes('.') && /\.\d{3}(?:\.|$)/.test(raw)) raw = raw.replace(/\./g, '');

        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const parseReferenceRange = (text) => {
        if (!text) return null;
        const line = text.split('\n')[0].replace(/\s+/g, ' ').trim();

        const rangeMatch = line.match(/(-?\d+[\d.,]*)\s*(?:–|-|a|até)\s*(-?\d+[\d.,]*)/i);
        if (rangeMatch) return { min: toNumber(rangeMatch[1]), max: toNumber(rangeMatch[2]) };

        const lteMatch = line.match(/(?:≤|<=|<)\s*(-?\d+[\d.,]*)/);
        if (lteMatch) return { min: null, max: toNumber(lteMatch[1]) };

        const gteMatch = line.match(/(?:≥|>=|>)\s*(-?\d+[\d.,]*)/);
        if (gteMatch) return { min: toNumber(gteMatch[1]), max: null };

        return null;
    };

    const evaluateStatus = (resultText, refText) => {
        const value = toNumber(resultText);
        const range = parseReferenceRange(refText);
        if (value === null || !range) return 'NORMAL';
        if ((range.min !== null && value < range.min) || (range.max !== null && value > range.max)) return 'ALTERADO';
        return 'NORMAL';
    };

    const formatDateValue = (value) => {
        if (!value || !value.includes('-')) return value || '';
        const parts = value.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
    };

    const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const fillDateTime = () => {
        const now = new Date();
        const dateInput = document.querySelector('[data-header-field="data"]');
        const timeInput = document.querySelector('[data-header-field="horario"]');
        if (dateInput && !dateInput.value) dateInput.value = toISODate(now);
        if (timeInput && !timeInput.value) timeInput.value = formatTimeBR(now);
    };

    const collectHeaderData = () => {
        const labelsByField = {
            nome_paciente: 'Nome do paciente',
            data_nascimento: 'Data de nascimento',
            atendimento: 'Atendimento',
            data: 'Data',
            horario: 'Horário',
            liberado_por: 'Liberado por'
        };

        return headerInputs
            .map((input) => {
                const key = input.dataset.headerField;
                const value = input.value.trim();
                if (!value) return null;

                return {
                    key,
                    label: labelsByField[key] || key,
                    value: input.type === 'date' ? formatDateValue(value) : value
                };
            })
            .filter(Boolean);
    };

    const collectExamData = () => {
        const sections = [];

        examCards.forEach((card) => {
            const title = card.querySelector('.card-header')?.textContent.trim() || 'Exame';
            const rows = Array.from(card.querySelectorAll('tbody tr'))
                .map((row) => {
                    const examName = row.querySelector('.param')?.textContent.trim() || '';
                    const input = row.querySelector('.exam-input');
                    const result = input?.value.trim() || '';
                    if (!result) return null;

                    const reference = row.querySelector('.ref-text')?.textContent.trim() || '';
                    return {
                        examName,
                        result,
                        reference,
                        status: evaluateStatus(result, reference)
                    };
                })
                .filter(Boolean);

            if (rows.length) sections.push({ title, rows });
        });

        return sections;
    };

    const buildLaudoHtml = (headerData, examSections) => {
        const now = new Date();
        const generatedDateTime = `${formatDateBR(now)} — ${formatTimeBR(now)}`;

        const headerItems = headerData.length
            ? `<div class="patient-grid">${headerData
                .map((item) => `<div class="patient-item"><span class="label">${escapeHtml(item.label)}:</span> <span class="value">${escapeHtml(item.value)}</span></div>`)
                .join('')}</div>`
            : '<p class="empty-msg">Nenhum dado de identificação preenchido.</p>';

        const sectionsHtml = examSections.length
            ? examSections.map((section) => `
                <section class="exam-section">
                    <h2>${escapeHtml(section.title)}</h2>
                    <div class="exam-list">
                        ${section.rows.map((row) => `
                            <article class="exam-item">
                                <p><strong>${escapeHtml(row.examName)}:</strong> ${escapeHtml(row.result)}</p>
                                <p><strong>Referência:</strong> ${escapeHtml(row.reference || 'Não informada')}</p>
                                <p><strong>Status:</strong> ${escapeHtml(row.status)}</p>
                            </article>
                        `).join('')}
                    </div>
                </section>
            `).join('')
            : '<p class="empty-msg">Nenhum exame preenchido para emissão do laudo.</p>';

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laudo Clínico</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 24px;
        font-family: "Arial", "Helvetica", sans-serif;
        background: #f5f7fa;
        color: #1f2933;
    }
    .laudo-wrap {
        max-width: 900px;
        margin: 0 auto;
        background: #fff;
        border: 1px solid #d9e2ec;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        padding: 28px;
    }
    .top-bar {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 16px;
    }
    .print-btn {
        border: 0;
        border-radius: 6px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        background: #1f5d99;
        color: #fff;
    }
    h1 {
        margin: 0 0 8px;
        font-size: 26px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #123a5c;
    }
    .generated {
        margin: 0 0 24px;
        font-size: 14px;
        color: #52606d;
    }
    .block-title {
        margin: 0 0 12px;
        font-size: 16px;
        text-transform: uppercase;
        color: #334e68;
        border-bottom: 1px solid #d9e2ec;
        padding-bottom: 6px;
    }
    .patient-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 8px 18px;
        margin-bottom: 28px;
    }
    .patient-item {
        font-size: 14px;
        line-height: 1.45;
    }
    .patient-item .label {
        color: #486581;
        font-weight: 700;
    }
    .exam-section {
        margin-bottom: 22px;
        break-inside: avoid;
    }
    .exam-section h2 {
        margin: 0 0 10px;
        color: #102a43;
        font-size: 15px;
        text-transform: uppercase;
        letter-spacing: .03em;
    }
    .exam-list {
        border: 1px solid #d9e2ec;
        border-radius: 4px;
    }
    .exam-item {
        padding: 10px 12px;
        border-bottom: 1px solid #e4ebf1;
        font-size: 14px;
    }
    .exam-item:last-child {
        border-bottom: 0;
    }
    .exam-item p {
        margin: 4px 0;
    }
    .empty-msg {
        margin: 10px 0 24px;
        color: #7b8794;
        font-style: italic;
    }

    @page {
        size: A4;
        margin: 14mm;
    }

    @media print {
        body {
            background: #fff !important;
            padding: 0;
        }
        .laudo-wrap {
            max-width: none;
            border: 0;
            box-shadow: none;
            padding: 0;
        }
        .top-bar {
            display: none !important;
        }
        .exam-section,
        .exam-list,
        .exam-item {
            break-inside: avoid;
            page-break-inside: avoid;
        }
    }
</style>
</head>
<body>
    <main class="laudo-wrap">
        <div class="top-bar">
            <button id="print-laudo" class="print-btn" type="button">Imprimir Laudo</button>
        </div>

        <h1>Laudo Clínico</h1>
        <p class="generated">Emitido em: ${escapeHtml(generatedDateTime)}</p>

        <section>
            <h2 class="block-title">Identificação</h2>
            ${headerItems}
        </section>

        <section>
            <h2 class="block-title">Exames Preenchidos</h2>
            ${sectionsHtml}
        </section>
    </main>

<script>
    (function () {
        const button = document.getElementById('print-laudo');
        if (button) {
            button.addEventListener('click', function () {
                window.print();
            });
        }
    })();
</script>
</body>
</html>`;
    };

    const generateLaudo = () => {
        const headerData = collectHeaderData();
        const examSections = collectExamData();

        const popup = window.open('', '_blank', 'noopener');
        if (!popup) {
            window.alert('Não foi possível abrir a nova guia para gerar o laudo.');
            return;
        }

        popup.document.open();
        popup.document.write(buildLaudoHtml(headerData, examSections));
        popup.document.close();
    };

    if (generateBtn) {
        generateBtn.textContent = 'Gerar Laudo';
        generateBtn.addEventListener('click', generateLaudo);
    }

    fillDateTime();
})();
