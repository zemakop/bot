import { Bot, Keyboard } from '@maxhub/max-bot-api';
import { getUser, setConsent, setEmail, activate, reserveTextRequest, refundTextRequest, recentMessages, saveExchange, insertOrder, setPaymentId } from './db.mjs';
import { PLANS, resolvePlan, formatMinutes, remainingMinutes } from './plans.mjs';
import { makeOrder, makePayment } from './yookassa.mjs';
import { askText } from './gigachat.mjs';

const perHour = Number(process.env.TEXT_REQUESTS_PER_HOUR || 40);
const menu = () => Keyboard.inlineKeyboard([
  [Keyboard.button.callback('💳 Тарифы', 'menu:plans'), Keyboard.button.callback('⏱ Мой баланс', 'menu:balance')],
  [Keyboard.button.callback('▶ 1 час', 'activate:60'), Keyboard.button.callback('▶ 3 часа', 'activate:180')],
  [Keyboard.button.callback('▶ 8 часов', 'activate:480'), Keyboard.button.callback('ℹ Помощь', 'menu:help')]
]);

function userId(ctx) {
  const id = ctx.user?.user_id ?? ctx.message?.sender?.user_id;
  if (id === undefined || id === null) throw new Error('Не определён пользователь MAX');
  return String(id);
}

async function renderBalance(ctx) {
  const u = await getUser(userId(ctx));
  await ctx.reply(`Ваш баланс: ${formatMinutes(u.available_minutes)}.\n` +
    `Активная сессия: ${remainingMinutes(u.active_until) ? formatMinutes(remainingMinutes(u.active_until)) : 'нет'}.\n` +
    `Текстовые запросы: ${u.requests_used}/${u.request_quota}.`, { attachments: [menu()] });
}

async function showPlans(ctx) {
  const kb = Keyboard.inlineKeyboard([
    ...Object.values(PLANS).map(p => [Keyboard.button.callback(`${p.label} — ${p.rub} ₽`, `buy:${p.id}`)]),
    [Keyboard.button.callback('Мой баланс', 'menu:balance')]
  ]);
  await ctx.reply('Тарифы (предварительные цены):\n' + Object.values(PLANS)
    .map(p => `${p.label}: ${p.rub} ₽`).join('\n') + '\n\nПосле оплаты часы зачисляются на баланс. Генерация видео и изображений здесь пока не реализована.', { attachments: [kb] });
}

async function tryBuy(ctx, planId) {
  const p = resolvePlan(planId);
  if (!p) return ctx.reply('Неизвестный тариф');
  if (process.env.ENABLE_PAYMENTS !== 'true') {
    return ctx.reply('Оплата пока отключена: это тестовый каркас. Деньги не списываются.');
  }
  const id = userId(ctx);
  const u = await getUser(id);
  if (!u.consent_at) return ctx.reply('Сначала ознакомьтесь с офертой и политикой конфиденциальности, затем отправьте /agree.');
  if (!u.email) return ctx.reply('Для чека укажите почту командой /email name@example.com');
  const order = makeOrder(id, p);
  await insertOrder(order);
  const pay = await makePayment(order, u.email, p);
  await setPaymentId(order.id, pay.id);
  if (!pay?.confirmation?.confirmation_url) throw new Error('Не получена ссылка на оплату');
  return ctx.reply(`Заказ ${p.label}. Оплатите ${p.rub} ₽ по ссылке. Время зачислится только после подтверждённой оплаты.`, {
    attachments: [Keyboard.inlineKeyboard([[Keyboard.button.link('Оплатить через ЮKassa', pay.confirmation.confirmation_url)]])]
  });
}

async function tryActivate(ctx, minutes) {
  if (![60,180,480].includes(minutes)) return ctx.reply('Выберите 1, 3 или 8 часов.');
  const result = await activate(userId(ctx), minutes, perHour);
  if (!result) return ctx.reply('Недостаточно часов на балансе. Нажмите «Тарифы».');
  return ctx.reply(`Готово. Сессия активна до ${new Date(result.active_until).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК).\nОтсчёт идёт непрерывно, даже если вы закрыли MAX.`);
}

async function handleText(ctx, text) {
  const id = userId(ctx);
  if (text === '/start') {
    await getUser(id);
    return ctx.reply('MAX AI Studio — ИИ по часам. Начните с тарифов или баланса.\nДля оплаты: /terms, затем /agree и /email ваша@почта.\nИнструменты файлов, фото и видео появятся в следующих модулях.', { attachments: [menu()] });
  }
  if (text === '/plans' || text === '/tariffs') return showPlans(ctx);
  if (text === '/balance') return renderBalance(ctx);
  if (text === '/help') return ctx.reply('Команды: /start /plans /balance /terms /agree /email адрес /activate 60|180|480.');
  if (text === '/terms') return ctx.reply(`Оферта: ${process.env.OFFER_URL}\nПолитика конфиденциальности: ${process.env.PRIVACY_URL}\nПосле ознакомления и согласия отправьте /agree.`);
  if (text === '/agree') {
    if (!process.env.OFFER_URL?.startsWith('https://') || !process.env.PRIVACY_URL?.startsWith('https://')) {
      return ctx.reply('Документы сервиса пока не опубликованы. Приём оплаты невозможен.');
    }
    await setConsent(id); return ctx.reply('Согласие зафиксировано. Для электронного чека укажите почту: /email name@example.com');
  }
  if (text.startsWith('/email ')) {
    const email = text.slice(7).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return ctx.reply('Некорректный адрес почты');
    const u = await getUser(id);
    if (!u.consent_at) return ctx.reply('Сначала прочтите /terms и подтвердите /agree');
    await setEmail(id, email); return ctx.reply('Почта для чека сохранена. Теперь можете выбрать тариф.');
  }
  if (text.startsWith('/activate ')) return tryActivate(ctx, Number(text.split(' ')[1]));
  if (text.startsWith('/buy ')) return tryBuy(ctx, text.split(' ')[1]);
  if (text.startsWith('/')) return ctx.reply('Неизвестная команда. Напишите /help');
  if (text.length > 4000) return ctx.reply('Для первой версии длина текстового запроса ограничена 4000 символами.');

  const account = await getUser(id);
  if (remainingMinutes(account.active_until) === 0) return ctx.reply('Время доступа истекло. Посмотрите /balance или /plans.');
  if (!process.env.GIGACHAT_AUTH_KEY) return ctx.reply('Текстовая ИИ-модель пока не подключена. Обратитесь к администратору.');
  if (!await reserveTextRequest(id)) return ctx.reply('Текстовый лимит исчерпан либо время закончилось. Проверьте /balance.');
  try {
    const history = await recentMessages(id, 10);
    const answer = await askText(history, text);
    await saveExchange(id, text, answer);
    // Длинные ответы пока разбиваем на сообщения; файлы — в следующем этапе.
    for (let i = 0; i < answer.length; i += 3500) await ctx.reply(answer.slice(i, i + 3500));
  } catch (e) {
    await refundTextRequest(id);
    console.error('AI request failed:', e.message);
    await ctx.reply('Не удалось обработать запрос. Попробуйте позднее. Лимит запроса возвращён.');
  }
}

export function startBot() {
  if (!process.env.BOT_TOKEN) throw new Error('Заполните BOT_TOKEN в .env');
  const bot = new Bot(process.env.BOT_TOKEN);
  bot.on('message_created', async ctx => {
    try {
      const txt = ctx.message?.body?.text;
      if (typeof txt !== 'string' || !txt.trim()) return;
      await handleText(ctx, txt.trim());
    } catch (e) { console.error('MAX:', e.message); try { await ctx.reply('Ошибка. Попробуйте ещё раз.'); } catch {} }
  });
  const actions = [
    ['menu:plans', showPlans], ['menu:balance', renderBalance],
    ['menu:help', ctx => ctx.reply('Команды: /start /plans /balance /terms /agree /email адрес /activate 60|180|480.')],
    ...Object.values(PLANS).map(p => [`buy:${p.id}`, ctx => tryBuy(ctx, p.id)]),
    ...[60,180,480].map(m => [`activate:${m}`, ctx => tryActivate(ctx, m)])
  ];
  for (const [action, handler] of actions) bot.action(action, async ctx => {
    try { await handler(ctx); }
    catch (e) { console.error('MAX action:', e.message); await ctx.reply('Операция не выполнена. Проверьте настройки или обратитесь к администратору.'); }
  });
  // Для локальной разработки. В production следует перевести MAX на HTTPS Webhook.
  bot.start();
  return bot;
}
