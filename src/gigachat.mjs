import { randomUUID } from 'node:crypto';

let cached = null;
let validUntil = 0;

async function auth() {
  const key = process.env.GIGACHAT_AUTH_KEY;
  if (!key) throw new Error('GigaChat пока не подключён: нет GIGACHAT_AUTH_KEY');
  if (cached && Date.now() < validUntil - 90_000) return cached;
  const r = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
    method: 'POST', signal: AbortSignal.timeout(20000),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'RqUID': randomUUID(),
      'Authorization': 'Basic ' + key.replace(/^Basic\s+/i, '')
    },
    body: new URLSearchParams({ scope: process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_CORP' })
  });
  if (!r.ok) throw new Error(`GigaChat авторизация: HTTP ${r.status}`);
  const result = await r.json();
  cached = result.access_token;
  const expires = Number(result.expires_at || 0);
  validUntil = expires > 10 ** 12 ? expires : expires * 1000;
  return cached;
}

export async function askText(history, question) {
  const bearer = await auth();
  const messages = [
    { role: 'system', content: 'Ты полезный ИИ-помощник по программированию и работе с документами. Если нужны файлы, объясняй, что файловые инструменты подключаются отдельным модулем.' },
    ...history,
    { role: 'user', content: question }
  ];
  const r = await fetch('https://api.giga.chat/v1/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.GIGACHAT_MODEL || 'GigaChat-2-Max', messages, stream: false, max_tokens: 1800 })
  });
  if (!r.ok) throw new Error(`GigaChat ответ: HTTP ${r.status}`);
  const answer = (await r.json())?.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer) throw new Error('GigaChat вернул пустой ответ');
  return answer;
}
