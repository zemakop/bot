import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

export async function initializeDatabase() {
  const sql = await readFile(fileURLToPath(new URL('../sql/schema.sql', import.meta.url)), 'utf8');
  await pool.query(sql);
}

export async function ensureUser(userId) {
  await pool.query('INSERT INTO users(max_user_id) VALUES($1) ON CONFLICT DO NOTHING', [userId]);
}

export async function getUser(userId) {
  await ensureUser(userId);
  const { rows } = await pool.query('SELECT * FROM users WHERE max_user_id=$1', [userId]);
  return rows[0];
}

export async function setConsent(userId) {
  await ensureUser(userId);
  await pool.query('UPDATE users SET consent_at=NOW() WHERE max_user_id=$1', [userId]);
}

export async function setEmail(userId, email) {
  await ensureUser(userId);
  await pool.query('UPDATE users SET email=$2 WHERE max_user_id=$1', [userId, email]);
}

export async function activate(userId, minutes, perHour) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO users(max_user_id) VALUES($1) ON CONFLICT DO NOTHING', [userId]);
    const { rows } = await client.query(`
      UPDATE users SET
        available_minutes=available_minutes-$2,
        active_until=GREATEST(COALESCE(active_until,NOW()),NOW()) + ($2 * INTERVAL '1 minute'),
        request_quota=request_quota + ($2 * $3 / 60)
      WHERE max_user_id=$1 AND available_minutes >= $2
      RETURNING active_until, available_minutes, request_quota, requests_used
    `, [userId, minutes, perHour]);
    if (!rows.length) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO activations(max_user_id,minutes,active_until) VALUES($1,$2,$3)',
      [userId, minutes, rows[0].active_until]);
    await client.query('COMMIT');
    return rows[0];
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

// Атомарный контроль времени и числа текстовых запросов.
export async function reserveTextRequest(userId) {
  const { rowCount } = await pool.query(`UPDATE users SET requests_used=requests_used+1
    WHERE max_user_id=$1 AND active_until>NOW() AND requests_used<request_quota`, [userId]);
  return rowCount === 1;
}

export async function refundTextRequest(userId) {
  await pool.query('UPDATE users SET requests_used=GREATEST(requests_used-1,0) WHERE max_user_id=$1', [userId]);
}

export async function recentMessages(userId, count = 10) {
  const { rows } = await pool.query('SELECT role,content FROM messages WHERE max_user_id=$1 ORDER BY id DESC LIMIT $2', [userId, count]);
  return rows.reverse();
}

export async function saveExchange(userId, question, answer) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("INSERT INTO messages(max_user_id,role,content) VALUES ($1,'user',$2)", [userId, question]);
    await client.query("INSERT INTO messages(max_user_id,role,content) VALUES ($1,'assistant',$2)", [userId, answer]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

export async function insertOrder(order) {
  await pool.query('INSERT INTO orders(id,max_user_id,plan_id,price_kopecks,minutes) VALUES ($1,$2,$3,$4,$5)',
    [order.id, order.userId, order.planId, order.kopecks, order.minutes]);
}

export async function setPaymentId(orderId, paymentId) {
  await pool.query('UPDATE orders SET provider_payment_id=$2 WHERE id=$1', [orderId, paymentId]);
}

// Повторный webhook не должен начислять время второй раз.
export async function creditVerifiedPayment(payment) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderId = payment?.metadata?.order_id;
    if (!orderId) { await client.query('ROLLBACK'); return 'unknown'; }
    const { rows } = await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [orderId]);
    const o = rows[0];
    if (!o) { await client.query('ROLLBACK'); return 'unknown'; }
    if (o.status === 'succeeded') { await client.query('ROLLBACK'); return 'duplicate'; }
    const correctAmount = Number(payment?.amount?.value) * 100 === o.price_kopecks;
    const matches = payment.status === 'succeeded' && payment.paid === true &&
      payment.amount?.currency === 'RUB' && correctAmount &&
      (!o.provider_payment_id || o.provider_payment_id === payment.id);
    if (!matches) { await client.query('ROLLBACK'); return 'invalid'; }
    await client.query(`UPDATE orders SET status='succeeded', paid_at=NOW(), provider_payment_id=$2 WHERE id=$1`, [o.id, payment.id]);
    await client.query('UPDATE users SET available_minutes=available_minutes+$2 WHERE max_user_id=$1', [o.max_user_id, o.minutes]);
    await client.query('COMMIT');
    return 'credited';
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
