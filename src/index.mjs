import 'dotenv/config';
import { initializeDatabase, pool } from './db.mjs';
import { startServer } from './server.mjs';
import { startBot } from './bot.mjs';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Укажи DATABASE_URL в .env');
  await initializeDatabase();
  const server = startServer();
  startBot();
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.once(sig, () => server.close(async () => { await pool.end(); process.exit(0); }));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
