'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../assets/calculator.js');

test('КП: 6 позиций, 2 маршрута, без заявок по сырью = 163 000; анализ не добавляется дважды', () => {
  const q = calc.calculate({ positions: 6, routes: 2, fabric: 0 });
  assert.equal(q.total, 163000);
  assert.equal(q.extraPositions, 4);
  assert.deepEqual([q.firstPayment, q.secondPayment, q.thirdPayment], [80000, 41500, 41500]);
  assert.equal(q.perRoutePayment, 20750);
});
test('Минимальный проект: одна позиция и один маршрут', () => {
  const q = calc.calculate({ positions: 1, routes: 1, fabric: 0 });
  assert.equal(q.total, 100000);
  assert.equal(q.extraPositionCost, 0);
  assert.equal(q.secondRouteCost, 0);
  assert.deepEqual([q.firstPayment, q.secondPayment, q.thirdPayment], [80000, 10000, 10000]);
});
test('Два маршрута включают две позиции', () => {
  const q = calc.calculate({ positions: 2, routes: 2, fabric: 0 });
  assert.equal(q.total, 135000);
  assert.equal(q.extraPositions, 0);
  assert.equal(q.secondPayment, 27500);
  assert.equal(q.perRoutePayment, 13750);
});
test('Один маршрут и шесть позиций: пять дополнительных позиций', () => {
  const q = calc.calculate({ positions: 6, routes: 1, fabric: 0 });
  assert.equal(q.total, 135000);
  assert.equal(q.extraPositions, 5);
});
test('Одна и несколько отдельных заявок по сырью считаются отдельно', () => {
  assert.equal(calc.calculate({ positions: 6, routes: 2, fabric: 1 }).total, 193000);
  assert.equal(calc.calculate({ positions: 6, routes: 2, fabric: 3 }).total, 253000);
});
test('Невозможные и некорректные вводы не дают правдоподобный расчёт', () => {
  const invalid = [
    { positions: 1, routes: 2, fabric: 0 },
    ...[0, -1, 1.5, NaN, Infinity, '', null, '6', 1001].map(positions => ({ positions, routes: 1, fabric: 0 })),
    ...[-1, 0.5, NaN, Infinity, '', null, '0', 1001].map(fabric => ({ positions: 2, routes: 1, fabric })),
    ...[0, 3, 1.5, NaN, null, '2'].map(routes => ({ positions: 2, routes, fabric: 0 }))
  ];
  for (const input of invalid) {
    assert.equal(calc.validate(input).valid, false, JSON.stringify(input));
    assert.throws(() => calc.calculate(input), RangeError);
  }
});
test('Граничное значение: все платежи сходятся с общей ценой', () => {
  const q = calc.calculate({ positions: 1000, routes: 2, fabric: 1000 });
  assert.equal(q.total, 37121000);
  assert.equal(q.firstPayment + q.secondPayment + q.thirdPayment, q.total);
  assert.equal(q.perRoutePayment * 2, q.secondPayment);
});
test('Скопированный расчёт сохраняет условия, состав и разбивку платежей', () => {
  const q = calc.calculate({ positions: 6, routes: 2, fabric: 0 });
  const summary = calc.summary(q).replace(/\u00a0|\u202f/g, ' ');
  assert.match(summary, /Итого: 163 000 ₽, включая анализ за 80 000 ₽/);
  assert.match(summary, /по 20 750 ₽ на заявку/);
  assert.match(summary, /внешние расходы не включены/);
  assert.equal(calc.formula(q).replace(/\u00a0|\u202f/g, ' '), '100 000 + 35 000 + 4 × 7 000 = 163 000 ₽');
});

test('Работа по договорам подряда: 188 000 ₽ и обновлённые платежи для основного примера', () => {
  const q = calc.calculate({ positions: 6, routes: 2, fabric: 0, contractWork: true });
  assert.equal(q.total, 188000);
  assert.equal(q.contractWorkCost, 25000);
  assert.deepEqual([q.firstPayment, q.secondPayment, q.thirdPayment], [80000, 54000, 54000]);
  assert.equal(q.perRoutePayment, 27000);
  assert.equal(calc.formula(q).replace(/\u00a0|\u202f/g, ' '), '100 000 + 35 000 + 4 × 7 000 + 25 000 = 188 000 ₽');
  assert.match(calc.summary(q).replace(/\u00a0|\u202f/g, ' '), /Работа по договорам подряда: 25 000 ₽ за проект/);
});

test('Доплата за подряд начисляется один раз при любом количестве заявок', () => {
  assert.equal(calc.calculate({ positions: 1, routes: 1, fabric: 0, contractWork: true }).total, 125000);
  const q = calc.calculate({ positions: 5, routes: 2, fabric: 2, contractWork: true });
  assert.equal(q.total, 241000);
  assert.deepEqual([q.firstPayment, q.secondPayment, q.thirdPayment], [80000, 80500, 80500]);
});

test('Отключённая или не переданная опция не добавляет стоимость', () => {
  const q = calc.calculate({ positions: 6, routes: 2, fabric: 0, contractWork: false });
  assert.equal(q.total, 163000);
  assert.equal(q.contractWorkCost, 0);
  assert.deepEqual(q, calc.calculate({ positions: 6, routes: 2, fabric: 0 }));
  assert.match(calc.summary(q), /Работа по договорам подряда: не выбрана/);
});

test('Неоднозначное значение опции не приводит к случайному начислению доплаты', () => {
  for (const contractWork of [null, 0, 1, 'true', 'false', '']) {
    assert.throws(() => calc.calculate({ positions: 6, routes: 2, fabric: 0, contractWork }), RangeError);
  }
});
