// Демонстрационные цены; менять только после расчёта себестоимости и налогов.
export const PLANS = Object.freeze({
  hour_1: Object.freeze({ id: 'hour_1', label: 'Старт — 1 час', minutes: 60, rub: 199 }),
  hour_3: Object.freeze({ id: 'hour_3', label: 'Проект — 3 часа', minutes: 180, rub: 499 }),
  hour_8: Object.freeze({ id: 'hour_8', label: 'Профессионал — 8 часов', minutes: 480, rub: 990 })
});

export function resolvePlan(id) {
  return Object.hasOwn(PLANS, id) ? PLANS[id] : null;
}

export function durationMs(minutes) {
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 480) {
    throw new RangeError('Некорректное количество минут');
  }
  return minutes * 60_000;
}

export function formatMinutes(minutes) {
  const value = Math.max(0, Math.floor(minutes));
  return `${Math.floor(value / 60)} ч ${value % 60} мин`;
}

export function remainingMinutes(until, now = Date.now()) {
  if (!until) return 0;
  return Math.max(0, Math.ceil((new Date(until).getTime() - now) / 60_000));
}

export function isSessionActive(until, now = Date.now()) {
  return Boolean(until && new Date(until).getTime() > now);
}
