import { randomUUID } from 'node:crypto';

const base = 'https://api.yookassa.ru/v3';

function config() {
  const { YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, YOOKASSA_VAT_CODE, SERVICE_URL } = process.env;
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY || !YOOKASSA_VAT_CODE || !SERVICE_URL?.startsWith('https://')) {
    throw new Error('Не настроены реквизиты магазина, НДС-код и публичный HTTPS-адрес');
  }
  return { shop: YOOKASSA_SHOP_ID, key: YOOKASSA_SECRET_KEY, vat: Number(YOOKASSA_VAT_CODE), service: SERVICE_URL };
}

async function requestYoo(path, init = {}) {
  const c = config();
  const r = await fetch(base + path, {
    ...init,
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: 'Basic ' + Buffer.from(c.shop + ':' + c.key).toString('base64'),
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });
  if (!r.ok) throw new Error(`Ошибка ЮKassa: HTTP ${r.status}`);
  return r.json();
}

export async function makePayment(order, email, plan) {
  const c = config();
  const value = plan.rub.toFixed(2);
  return requestYoo('/payments', {
    method: 'POST',
    headers: { 'Idempotence-Key': order.id },
    body: JSON.stringify({
      amount: { value, currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: c.service + '/return' },
      description: `MAX AI Studio: ${plan.label}`,
      metadata: { order_id: order.id },
      receipt: {
        customer: { email },
        items: [{
          description: `Доступ к MAX AI Studio: ${plan.label}`,
          quantity: '1.00',
          amount: { value, currency: 'RUB' },
          vat_code: c.vat,
          payment_mode: 'full_prepayment',
          payment_subject: 'service'
        }]
      }
    })
  });
}

export async function fetchPayment(paymentId) {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(paymentId)) throw new Error('Некорректный id платежа');
  return requestYoo('/payments/' + paymentId);
}

export function makeOrder(userId, plan) {
  return { id: randomUUID(), userId, planId: plan.id, kopecks: plan.rub * 100, minutes: plan.minutes };
}
