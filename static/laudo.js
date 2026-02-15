(function () {
    const categoryOrder = [
        'Hemograma',
        'Bioquímica',
        'Eletrólitos',
        'Função Hepática',
        'Marcadores Cardíacos',
        'Coagulograma',
        'Gasometria Arterial',
        'Gasometria Venosa',
        'Sorologias',
        'Outros exames'
    ];

    const sectionCategoryMap = {
        HEMOGRAMA: 'Hemograma',
        BIOQUÍMICA: 'Bioquímica',
        'BIOQUIMICA': 'Bioquímica',
        ELETRÓLITOS: 'Eletrólitos',
        'ELETROLITOS': 'Eletrólitos',
        'FUNÇÃO HEPÁTICA': 'Função Hepática',
        'FUNCAO HEPATICA': 'Função Hepática',
        'MARCADORES CARDÍACOS': 'Marcadores Cardíacos',
        'MARCADORES CARDIACOS': 'Marcadores Cardíacos',
        COAGULOGRAMA: 'Coagulograma',
        'GASOMETRIA ARTERIAL': 'Gasometria Arterial',
        'GASOMETRIA VENOSA': 'Gasometria Venosa',
        SOROLOGIAS: 'Sorologias',
        'OUTROS EXAMES': 'Outros exames'
    };

    const headerFields = Array.from(document.querySelectorAll('.header-grid .field'));
    const examCards = Array.from(document.querySelectorAll('.exam-card'));

    const sanitize = (value) =>
        String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const getFieldInputByLabel = (labelText) => {
        const field = headerFields.find((item) => {
            const label = item.querySelector('label');
            return label && label.textContent.trim().toLowerCase() === labelText.toLowerCase();
        });
        return field ? field.querySelector('input') : null;
    };

    const formatDateBR = (date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const formatTimeBR = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const toISODate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const fillDateTime = () => {
        const now = new Date();
        const dateInput = getFieldInputByLabel('Data');
        const timeInput = getFieldInputByLabel('Horário');
        if (dateInput && !dateInput.value) dateInput.value = toISODate(now);
        if (timeInput && !timeInput.value) timeInput.value = formatTimeBR(now);
    };

    const toNumber = (value) => {
        if (!value) return null;
        const matched = String(value).match(/-?\d+[\d.,]*/);
        if (!matched) return null;
        let raw = matched[0].replace(/\s/g, '');

        if (raw.includes('.') && raw.includes(',')) {
            raw = raw.replace(/\./g, '').replace(',', '.');
        } else if (raw.includes(',') && !raw.includes('.')) {
            raw = raw.replace(',', '.');
        } else if (raw.includes('.') && /\.\d{3}(?:\.|$)/.test(raw)) {
            raw = raw.replace(/\./g, '');
        }

        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const parseReferenceRange = (text) => {
        if (!text) return null;
        const line = text.split('\n')[0].replace(/\s+/g, ' ').trim();

        const rangeMatch = line.match(/(-?\d+[\d.,]*)\s*(?:–|-|a|até)\s*(-?\d+[\d.,]*)/i);
        if (rangeMatch) {
            return { min: toNumber(rangeMatch[1]), max: toNumber(rangeMatch[2]) };
        }

        const lteMatch = line.match(/(?:≤|<=|<)\s*(-?\d+[\d.,]*)/);
        if (lteMatch) {
            return { min: null, max: toNumber(lteMatch[1]) };
        }

        const gteMatch = line.match(/(?:≥|>=|>)\s*(-?\d+[\d.,]*)/);
        if (gteMatch) {
            return { min: toNumber(gteMatch[1]), max: null };
        }

        return null;
    };

    const evaluateStatus = (resultText, refText) => {
        const value = toNumber(resultText);
        const range = parseReferenceRange(refText);
        if (value === null || !range) return { css: 'normal', label: 'NORMAL' };
        if (range.min !== null && value < range.min) return { css: 'low', label: 'BAIXO' };
        if (range.max !== null && value > range.max) return { css: 'high', label: 'ALTO' };
        return { css: 'normal', label: 'NORMAL' };
    };

    const attachStatusToRows = () => {
        examCards.forEach((card) => {
            card.querySelectorAll('.row').forEach((row) => {
                const input = row.querySelector('.result input');
                const ref = row.querySelector('.ref')?.textContent.trim() || '';
                const resultCell = row.querySelector('.result');
                if (!input || !resultCell) return;

                let badge = resultCell.querySelector('.status-badge');
                if (!badge) {
                    badge = document.createElement('small');
                    badge.className = 'status-badge';
                    badge.style.display = 'block';
                    badge.style.marginTop = '4px';
                    badge.style.fontSize = '0.72rem';
                    badge.style.fontWeight = '700';
                    badge.style.letterSpacing = '0.04em';
                    resultCell.appendChild(badge);
                }

                const refresh = () => {
                    const result = input.value.trim();
                    row.classList.remove('low', 'normal', 'high');
                    input.classList.remove('low', 'normal', 'high');

                    if (!result) {
                        badge.textContent = '';
                        return;
                    }

                    const status = evaluateStatus(result, ref);
                    row.classList.add(status.css);
                    input.classList.add(status.css);
                    badge.classList.remove('low', 'normal', 'high');
                    badge.classList.add(status.css);
                    badge.textContent = status.label;
                    badge.style.color = status.css === 'high' ? '#b42318' : status.css === 'low' ? '#1d4ed8' : '#0f5132';
                };

                input.addEventListener('input', refresh);
                refresh();
            });
        });
    };

    const normalizeTitle = (title) => title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const pickCategory = (title) => sectionCategoryMap[normalizeTitle(title)] || 'Outros exames';

    const formatDateValue = (value) => {
        if (!value || !value.includes('-')) return value || '';
        const parts = value.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
    };

    const collectHeaderData = () => headerFields
        .map((field) => {
            const label = field.querySelector('label');
            const input = field.querySelector('input');
            if (!label || !input || !input.value.trim()) return null;
            return {
                label: label.textContent.trim(),
                value: input.type === 'date' ? formatDateValue(input.value.trim()) : input.value.trim()
            };
        })
        .filter(Boolean);

    const collectExamData = () => {
        const grouped = {};

        examCards.forEach((card) => {
            const title = card.querySelector('.card-title')?.textContent.trim() || 'Exame';
            const category = pickCategory(title);
            const rows = Array.from(card.querySelectorAll('.row'))
                .map((row) => {
                    const param = row.querySelector('.param')?.textContent.trim() || '';
                    const input = row.querySelector('.result input');
                    const result = input ? input.value.trim() : '';
                    if (!result) return null;
                    const ref = row.querySelector('.ref')?.textContent.trim() || '';
                    const status = evaluateStatus(result, ref);
                    return { param, result, ref, status: status.label };
                })
                .filter(Boolean);

            if (!rows.length) return;
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push({ title, rows });
        });

        return grouped;
    };

    const buildPdfHtml = () => {
        const headerData = collectHeaderData();
        const groupedExams = collectExamData();
        const generatedAt = `Emitido em ${formatDateBR(new Date())} às ${formatTimeBR(new Date())}`;

        const headerHtml = headerData.length
            ? `<section><h2>Identificação do Paciente</h2><div class="meta">${headerData.map((item) => `<p><strong>${sanitize(item.label)}:</strong> ${sanitize(item.value)}</p>`).join('')}</div></section>`
            : '';

        const sectionsHtml = categoryOrder
            .filter((category) => groupedExams[category] && groupedExams[category].length)
            .map((category) => {
                const examsHtml = groupedExams[category]
                    .map((exam) => `<article><h4>${sanitize(exam.title)}</h4><table><thead><tr><th>Exame</th><th>Resultado</th><th>Referência</th><th>Status</th></tr></thead><tbody>${exam.rows.map((row) => `<tr><td>${sanitize(row.param)}</td><td>${sanitize(row.result)}</td><td>${sanitize(row.ref)}</td><td>${sanitize(row.status)}</td></tr>`).join('')}</tbody></table></article>`)
                    .join('');
                return `<section><h3>${sanitize(category)}</h3>${examsHtml}</section>`;
            })
            .join('');

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Laudo Laboratorial - UPA</title>
<style>
body { font-family: Arial, sans-serif; margin: 20px; color: #111827; }
.header { border-bottom: 2px solid #1f3b5a; padding-bottom: 8px; margin-bottom: 10px; }
h1 { font-size: 20px; margin: 0; }
.subtitle { font-size: 12px; color: #374151; margin-top: 4px; }
h2, h3, h4 { margin: 12px 0 6px; }
h3 { font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #9ca3af; padding-bottom: 4px; }
h4 { font-size: 12px; color: #1f3b5a; }
p { margin: 3px 0; font-size: 12px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
th, td { border: 1px solid #c7d2fe; padding: 6px; font-size: 11px; text-align: left; vertical-align: top; }
th { background: #eef2ff; }
.footer { margin-top: 16px; font-size: 10px; color: #374151; }
@media print { body { margin: 10mm; } }
</style>
</head>
<body>
<header class="header"><h1>LAUDO LABORATORIAL - UPA</h1><p class="subtitle">Sistema Único de Saúde (SUS)</p></header>
${headerHtml}
${sectionsHtml || '<p>Nenhum exame preenchido.</p>'}
<p class="footer">${sanitize(generatedAt)}</p>
<script>window.onload = function(){ window.print(); };<\/script>
</body>
</html>`;
    };

    const setupGenerateButton = () => {
        const headerCard = document.querySelector('.header-card');
        if (!headerCard) return;

        headerCard.style.position = 'relative';

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Gerar PDF';
        button.setAttribute('aria-label', 'Gerar PDF');
        button.style.position = 'absolute';
        button.style.top = '14px';
        button.style.right = '14px';
        button.style.padding = '8px 14px';
        button.style.border = '1px solid #2e5b87';
        button.style.borderRadius = '8px';
        button.style.background = '#ffffff';
        button.style.color = '#2e5b87';
        button.style.fontWeight = '600';
        button.style.cursor = 'pointer';

        button.addEventListener('click', () => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;
            printWindow.document.open();
            printWindow.document.write(buildPdfHtml());
            printWindow.document.close();
        });

        headerCard.appendChild(button);
    };

    fillDateTime();
    setupGenerateButton();
    attachStatusToRows();
})();
