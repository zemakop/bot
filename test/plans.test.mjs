import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANS, resolvePlan, durationMs, formatMinutes, remainingMinutes, isSessionActive } from '../src/plans.mjs';

test('Тарифы доступны только из белого списка', () => {
  assert.equal(resolvePlan('hour_3'), PLANS.hour_3);
  assert.equal(resolvePlan('hour_999'), null);
  assert.equal(resolvePlan('__proto__'), null);
});
test('Продолжительность переводится в миллисекунды', () => {
  assert.equal(durationMs(180), 10_800_000);
  assert.throws(() => durationMs(-1));
  assert.throws(() => durationMs(481));
});
test('Показ времени и проверка активности', () => {
  const now = Date.parse('2026-10-15T10:00:00Z');
  assert.equal(remainingMinutes('2026-10-15T10:01:20Z', now), 2);
  assert.equal(remainingMinutes('2026-10-15T09:00:00Z', now), 0);
  assert.equal(isSessionActive('2026-10-15T10:01:00Z', now), true);
  assert.equal(isSessionActive('2026-10-15T09:59:59Z', now), false);
  assert.equal(formatMinutes(181), '3 ч 1 мин');
});
