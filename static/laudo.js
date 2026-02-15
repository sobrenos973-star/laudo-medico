(function () {
    const categoryOrder = [
        'Hemograma',
        'Urina Tipo I',
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
        'URINA TIPO I': 'Urina Tipo I',
        BIOQUÍMICA: 'Bioquímica',
        BIOQUIMICA: 'Bioquímica',
        ELETRÓLITOS: 'Eletrólitos',
        ELETROLITOS: 'Eletrólitos',
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
        if (value === null || !range) return { css: 'status-normal', label: 'NORMAL' };
        if (range.min !== null && value < range.min) return { css: 'status-low', label: 'BAIXO' };
        if (range.max !== null && value > range.max) return { css: 'status-high', label: 'ALTO' };
        return { css: 'status-normal', label: 'NORMAL' };
    };

    const formatDateValue = (value) => {
        if (!value || !value.includes('-')) return value || '';
        const parts = value.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
    };

    const normalizeTitle = (title) => title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const pickCategory = (title) => sectionCategoryMap[normalizeTitle(title)] || 'Outros exames';

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
        const grouped = {};

        examCards.forEach((card) => {
            const title = card.querySelector('.card-header')?.textContent.trim() || 'Exame';
            const category = pickCategory(title);

            const rows = Array.from(card.querySelectorAll('tbody tr'))
                .map((row) => {
                    const param = row.querySelector('.param')?.textContent.trim() || '';
                    const input = row.querySelector('.exam-input');
                    const result = input?.value.trim() || '';
                    if (!result) return null;

                    const ref = row.querySelector('.ref-text')?.textContent.trim() || '';
                    const status = evaluateStatus(result, ref).label;
                    return { param, result, ref, status };
                })
                .filter(Boolean);

            if (!rows.length) return;
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push({ title, rows });
        });

        return grouped;
    };

    const attachStatusToRows = () => {
        examCards.forEach((card) => {
            Array.from(card.querySelectorAll('tbody tr')).forEach((row) => {
                const input = row.querySelector('.exam-input');
                const ref = row.querySelector('.ref-text')?.textContent.trim() || '';
                if (!input) return;

                let badge = row.querySelector('.status-badge');
                if (!badge) {
                    badge = document.createElement('small');
                    badge.className = 'status-badge d-block mt-1';
                    input.insertAdjacentElement('afterend', badge);
                }

                const refresh = () => {
                    const result = input.value.trim();
                    badge.textContent = '';
                    badge.classList.remove('status-high', 'status-low', 'status-normal');
                    if (!result) return;

                    const status = evaluateStatus(result, ref);
                    badge.textContent = status.label;
                    badge.classList.add(status.css);
                };

                input.addEventListener('input', refresh);
                refresh();
            });
        });
    };

    const generatePdf = async () => {
        const payload = {
            header: collectHeaderData(),
            exams: collectExamData(),
            category_order: categoryOrder,
            generated_at: `Emitido em ${formatDateBR(new Date())} às ${formatTimeBR(new Date())}`
        };

        const response = await fetch('/gerar-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Falha ao gerar PDF.');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
    };

    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            try {
                await generatePdf();
            } catch (error) {
                alert(error.message || 'Erro ao gerar PDF.');
            }
        });
    }

    fillDateTime();
    attachStatusToRows();
})();
