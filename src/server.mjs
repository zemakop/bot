import express from 'express';
import { creditVerifiedPayment } from './db.mjs';
import { fetchPayment } from './yookassa.mjs';

export function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
  app.get('/return', (_req, res) => res.type('text/plain; charset=utf-8').send('Вернитесь в MAX и нажмите «Баланс». Оплата подтверждается независимо от этой страницы.'));

  app.post('/yookassa/webhook', async (req, res) => {
    try {
      if (req.body?.event !== 'payment.succeeded' || typeof req.body?.object?.id !== 'string') {
        return res.status(200).end();
      }
      // Ни при каких обстоятельствах не начислять по непроверенному телу вебхука.
      const verified = await fetchPayment(req.body.object.id);
      const result = await creditVerifiedPayment(verified);
      if (result === 'invalid' || result === 'unknown') console.warn('Неподтверждённый платёж:', result);
      res.status(200).end();
    } catch (e) {
      console.error('YooKassa webhook:', e.message);
      res.status(503).end(); // провайдер повторит позже
    }
  });

  const port = Number(process.env.PORT || 3005);
  const httpServer = app.listen(port, () => console.log(`HTTP started on :${port}`));
  return httpServer;
}
