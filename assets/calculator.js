/* Prices follow the commercial proposal and subsequent owner decisions. Amounts are in RUB. */
(function (root) {
  'use strict';
  const PRICES = Object.freeze({ firstApplication: 100000, secondRoute: 35000, extraPosition: 7000, fabricApplication: 30000, contractWork: 25000, analysis: 80000 });
  const INPUT_LIMIT = 1000;

  function validate(values) {
    const { positions, routes, fabric, contractWork = false } = values;
    if (routes !== 1 && routes !== 2) return { valid: false, fields: ['routes'], message: 'Выберите один или два маршрута.' };
    if (!Number.isInteger(positions) || positions < 1 || positions > INPUT_LIMIT) return { valid: false, fields: ['positions'], message: 'Введите целое количество позиций от 1 до 1 000.' };
    if (positions < routes) return { valid: false, fields: ['positions'], message: 'Для двух маршрутов нужно не менее двух позиций: минимум одна на каждый маршрут.' };
    if (!Number.isInteger(fabric) || fabric < 0 || fabric > INPUT_LIMIT) return { valid: false, fields: ['fabric'], message: 'Введите целое количество отдельных заявок по сырью от 0 до 1 000.' };
    if (typeof contractWork !== 'boolean') return { valid: false, fields: ['contract-work'], message: 'Укажите, нужна ли работа по договорам подряда.' };
    return { valid: true, fields: [], message: '' };
  }

  function calculate(values) {
    const validation = validate(values);
    if (!validation.valid) throw new RangeError(validation.message);
    const { positions, routes, fabric, contractWork = false } = values;
    const includedPositions = routes;
    const extraPositions = positions - includedPositions;
    const secondRouteCost = routes === 2 ? PRICES.secondRoute : 0;
    const extraPositionCost = extraPositions * PRICES.extraPosition;
    const fabricCost = fabric * PRICES.fabricApplication;
    const contractWorkCost = contractWork ? PRICES.contractWork : 0;
    const total = PRICES.firstApplication + secondRouteCost + extraPositionCost + fabricCost + contractWorkCost;
    const remainder = total - PRICES.analysis;
    const secondPayment = remainder / 2;
    return Object.freeze({ positions, routes, fabric, contractWork, includedPositions, extraPositions, secondRouteCost, extraPositionCost, fabricCost, contractWorkCost, total, firstPayment: PRICES.analysis, remainder, secondPayment, thirdPayment: secondPayment, perRoutePayment: secondPayment / routes });
  }

  const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  function number(value) { return formatter.format(value); }
  function money(value) { return `${number(value)} ₽`; }
  function formula(quote) {
    const terms = [number(PRICES.firstApplication)];
    if (quote.routes === 2) terms.push(number(PRICES.secondRoute));
    if (quote.extraPositions) terms.push(`${quote.extraPositions} × ${number(PRICES.extraPosition)}`);
    if (quote.fabric) terms.push(`${quote.fabric} × ${number(PRICES.fabricApplication)}`);
    if (quote.contractWork) terms.push(number(PRICES.contractWork));
    return `${terms.join(' + ')} = ${money(quote.total)}`;
  }
  function summary(quote) {
    const lines = [
      'Предварительный расчёт сопровождения включения продукции легпрома в Реестр российской промышленной продукции',
      `Реестровых позиций: ${quote.positions}. Маршрутов (заявок): ${quote.routes}.`,
      `Отдельных заявок по производителям сырья: ${quote.fabric}.`,
      `Первая заявка (маршрут), включая 1 позицию: ${money(PRICES.firstApplication)}.`,
      quote.routes === 2 ? `Вторая заявка (маршрут), включая 1 позицию: ${money(quote.secondRouteCost)}.` : 'Вторая заявка (маршрут) не требуется.',
      `Дополнительные позиции: ${quote.extraPositions} × ${money(PRICES.extraPosition)} = ${money(quote.extraPositionCost)}.`,
      `Отдельные заявки по сырью: ${quote.fabric} × ${money(PRICES.fabricApplication)} = ${money(quote.fabricCost)}.`,
      quote.contractWork ? `Работа по договорам подряда: ${money(quote.contractWorkCost)} за проект.` : 'Работа по договорам подряда: не выбрана.',
      `Итого: ${money(quote.total)}, включая анализ за ${money(PRICES.analysis)}.`,
      `При подписании договора: ${money(quote.firstPayment)}.`,
      `После успешной камеральной проверки: ${money(quote.secondPayment)}.`,
      `После формирования реестровых записей: ${money(quote.thirdPayment)}.`
    ];
    if (quote.routes === 2) lines.push(`Каждый из двух платежей остатка распределяется поровну: по ${money(quote.perRoutePayment)} на заявку, по мере достижения соответствующего результата.`);
    lines.push('Официальные тарифы ТПП и другие внешние расходы не включены. Итоговые состав и стоимость фиксируются после анализа в договоре / дополнительной спецификации.');
    return lines.join('\n');
  }

  const api = Object.freeze({ PRICES, INPUT_LIMIT, validate, calculate, money, formula, summary });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LegpromCalculator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
