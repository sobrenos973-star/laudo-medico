(function () {
    const headerInputs = Array.from(document.querySelectorAll('[data-header-field]'));
    const examCards = Array.from(document.querySelectorAll('.exam-card'));
    const generateBtn = document.getElementById('generate-pdf');

    const formatDateBR = (date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const formatTimeBR = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const toISODate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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

    const convertSorologyInputsToSelect = () => {
        const sorologyCard = examCards.find((card) => {
            const header = card.querySelector('.card-header')?.textContent || '';
            return header.trim().toUpperCase() === 'SOROLOGIAS';
        });

        if (!sorologyCard) return;

        const inputs = Array.from(sorologyCard.querySelectorAll('input.exam-input'));
        inputs.forEach((input) => {
            const select = document.createElement('select');
            select.className = input.className;

            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '';

            const negativeOption = document.createElement('option');
            negativeOption.value = 'Negativo';
            negativeOption.textContent = 'Negativo';

            const positiveOption = document.createElement('option');
            positiveOption.value = 'Positivo';
            positiveOption.textContent = 'Positivo';

            select.appendChild(emptyOption);
            select.appendChild(negativeOption);
            select.appendChild(positiveOption);

            input.replaceWith(select);
        });
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
                    return { examName, result, reference };
                })
                .filter(Boolean);

            if (rows.length) sections.push({ title, rows });
        });

        return sections;
    };

    const buildLaudoHtml = (headerData, examSections) => {
        const now = new Date();
        const autoDate = formatDateBR(now);
        const autoTime = formatTimeBR(now);

        const headerMap = headerData.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});

        const patientName = headerMap.nome_paciente || 'Não informado';

        const optionalHeaderFields = headerData.filter((item) => !['nome_paciente', 'data', 'horario'].includes(item.key));

        const optionalHeaderHtml = optionalHeaderFields.length
            ? `<div class="patient-grid">${optionalHeaderFields
                .map((item) => `<div class="patient-item"><span class="label">${escapeHtml(item.label)}:</span> <span class="value">${escapeHtml(item.value)}</span></div>`)
                .join('')}</div>`
            : '';

        const sectionsHtml = examSections.length
            ? examSections.map((section) => `
                <section class="exam-section">
                    <h2>${escapeHtml(section.title)}</h2>
                    <div class="exam-list">
                        ${section.rows.map((row) => `
                            <article class="exam-item">
                                <p class="exam-result"><strong>${escapeHtml(row.examName)}:</strong> ${escapeHtml(row.result)}</p>
                                <p class="exam-reference"><strong>Referência:</strong> ${escapeHtml(row.reference || 'Não informada')}</p>
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
<title>Laudo Laboratorial</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 24px;
        font-family: "Segoe UI", "Arial", sans-serif;
        background: #ffffff;
        color: #1f2937;
    }
    .laudo-wrap {
        max-width: 920px;
        margin: 0 auto;
        border: 1px solid #d1d5db;
        padding: 28px;
        background: #fff;
    }
    .top-bar {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 12px;
    }
    .print-btn {
        border: 1px solid #1f2937;
        border-radius: 4px;
        padding: 9px 14px;
        font-size: 13px;
        font-weight: 700;
        background: #ffffff;
        color: #111827;
        cursor: pointer;
    }
    .institution-header {
        border-bottom: 2px solid #9ca3af;
        padding-bottom: 12px;
        margin-bottom: 18px;
    }
    .institution-header h1 {
        margin: 0 0 8px;
        font-size: 28px;
        letter-spacing: .03em;
        text-transform: uppercase;
        color: #111827;
    }
    .header-line {
        margin: 4px 0;
        font-size: 14px;
    }
    .header-line .label {
        font-weight: 700;
    }
    .block-title {
        margin: 20px 0 10px;
        font-size: 15px;
        font-weight: 700;
        text-transform: uppercase;
        border-bottom: 1px solid #d1d5db;
        padding-bottom: 6px;
    }
    .patient-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 8px 16px;
    }
    .patient-item { font-size: 14px; }
    .patient-item .label { font-weight: 700; }
    .exam-section { margin-bottom: 16px; break-inside: avoid; }
    .exam-section h2 {
        margin: 0 0 8px;
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
    }
    .exam-list {
        border: 1px solid #d1d5db;
    }
    .exam-item {
        padding: 10px 12px;
        border-bottom: 1px solid #e5e7eb;
        font-size: 14px;
    }
    .exam-item:last-child { border-bottom: 0; }
    .exam-item p { margin: 2px 0; }
    .empty-msg { margin: 10px 0; font-style: italic; }
    @page {
        size: A4;
        margin: 14mm;
    }
    @media print {
        body { padding: 0; background: #fff !important; }
        .laudo-wrap { border: 0; padding: 0; max-width: none; }
        .top-bar { display: none !important; }
        .exam-section, .exam-list, .exam-item { break-inside: avoid; page-break-inside: avoid; }
    }
</style>
</head>
<body>
    <main class="laudo-wrap">
        <div class="top-bar">
            <button id="print-laudo" class="print-btn" type="button">Imprimir Laudo</button>
        </div>

        <header class="institution-header">
            <h1>LAUDO LABORATORIAL</h1>
            <p class="header-line"><span class="label">Nome do paciente:</span> ${escapeHtml(patientName)}</p>
            <p class="header-line"><span class="label">Data:</span> ${escapeHtml(autoDate)} <span class="label" style="margin-left:16px;">Hora:</span> ${escapeHtml(autoTime)}</p>
        </header>

        <section>
            ${optionalHeaderHtml}
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
        const laudoHtml = buildLaudoHtml(headerData, examSections);

        const popup = window.open('', '_blank');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            window.alert('Não foi possível abrir a nova guia para gerar o laudo.');
            return;
        }

        popup.document.open('text/html', 'replace');
        popup.document.write(laudoHtml);
        popup.document.close();
        popup.focus();
    };

    if (generateBtn) {
        generateBtn.textContent = 'Gerar Laudo';
        generateBtn.addEventListener('click', generateLaudo);
    }

    fillDateTime();
    convertSorologyInputsToSelect();
})();
