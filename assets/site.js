/* Progressive enhancement. No requests, cookies, storage or personal-data form. */
(function () {
  'use strict';
  const calculator = window.LegpromCalculator;
  const form = document.getElementById('price-form');
  if (!calculator || !form) return;

  const byId = id => document.getElementById(id);
  const positions = byId('positions');
  const fabric = byId('fabric');
  const contractWork = byId('contract-work');
  const error = byId('calc-error');
  const copy = byId('copy-estimate');
  const copyStatus = byId('copy-status');
  const fallback = byId('copy-fallback');
  const textarea = byId('estimate-text');
  let currentQuote = null;

  function integer(input) {
    const raw = input.value.trim();
    return /^\d+$/.test(raw) ? Number(raw) : NaN;
  }
  function values() {
    return { positions: integer(positions), routes: Number(form.querySelector('input[name="routes"]:checked')?.value), fabric: integer(fabric), contractWork: contractWork.checked };
  }
  function text(id, value) { byId(id).textContent = value; }
  function updateButtons() {
    form.querySelectorAll('[data-step]').forEach(button => {
      const field = byId(button.dataset.for);
      const value = integer(field);
      button.disabled = !Number.isInteger(value) || (Number(button.dataset.step) < 0 ? value <= Number(field.min) : value >= Number(field.max));
    });
  }
  function clearInvalidResult() {
    currentQuote = null;
    text('total', 'Уточните данные');
    ['route-cost', 'extra-cost', 'fabric-cost', 'contract-work-cost', 'payment-2', 'payment-3'].forEach(id => text(id, '—'));
    text('extra-label', 'Дополнительные позиции');
    text('fabric-label', 'Отдельные заявки по сырью');
    text('formula', 'Исправьте значения в калькуляторе, чтобы получить стоимость.');
    byId('route-payment-note').hidden = true;
    copy.disabled = true;
  }
  function render() {
    const input = values();
    positions.min = String(input.routes || 1);
    positions.removeAttribute('aria-invalid');
    fabric.removeAttribute('aria-invalid');
    contractWork.removeAttribute('aria-invalid');
    copyStatus.textContent = '';
    fallback.hidden = true;
    textarea.value = '';
    updateButtons();
    const validation = calculator.validate(input);
    error.textContent = validation.message;
    error.hidden = validation.valid;
    if (!validation.valid) {
      validation.fields.forEach(id => { if (byId(id)) byId(id).setAttribute('aria-invalid', 'true'); });
      clearInvalidResult();
      return;
    }
    currentQuote = calculator.calculate(input);
    const quote = currentQuote;
    text('total', calculator.money(quote.total));
    text('route-label', quote.routes === 2 ? 'Вторая заявка (маршрут) · 1 позиция' : 'Вторая заявка (маршрут) · не требуется');
    text('route-cost', calculator.money(quote.secondRouteCost));
    text('extra-label', `Дополнительные позиции · ${quote.extraPositions} × 7 000 ₽`);
    text('extra-cost', calculator.money(quote.extraPositionCost));
    text('fabric-label', `Отдельные заявки по сырью · ${quote.fabric}`);
    text('fabric-cost', calculator.money(quote.fabricCost));
    text('contract-work-cost', calculator.money(quote.contractWorkCost));
    text('formula', calculator.formula(quote));
    text('payment-2', calculator.money(quote.secondPayment));
    text('payment-3', calculator.money(quote.thirdPayment));
    byId('route-payment-note').hidden = quote.routes !== 2;
    text('route-payment-note', `При двух заявках каждый платёж остатка делится между ними поровну: по ${calculator.money(quote.perRoutePayment)} на заявку, по мере достижения результата.`);
    copy.disabled = false;
  }

  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
    const field = byId(button.dataset.for);
    const value = integer(field);
    if (!Number.isInteger(value)) return;
    field.value = String(Math.min(Number(field.max), Math.max(Number(field.min), value + Number(button.dataset.step))));
    render();
  }));
  byId('load-example').addEventListener('click', () => {
    positions.value = '6';
    fabric.value = '0';
    contractWork.checked = false;
    form.querySelector('input[name="routes"][value="2"]').checked = true;
    render();
  });
  copy.addEventListener('click', async () => {
    if (!currentQuote) return;
    const quoteAtClick = currentQuote;
    const content = calculator.summary(quoteAtClick);
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(content);
      if (currentQuote === quoteAtClick) copyStatus.textContent = 'Расчёт скопирован. Его можно отправить в сообщении.';
    } catch {
      if (currentQuote !== quoteAtClick) return;
      textarea.value = content;
      fallback.hidden = false;
      textarea.focus();
      textarea.select();
      copyStatus.textContent = 'Расчёт открыт ниже — скопируйте выделенный текст.';
    }
  });

  render();
  byId('interactive-calculator').hidden = false;
})();
