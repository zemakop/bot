-- Стартер: PostgreSQL. Все деньги фиксируются в заказах, время — в минутах.
CREATE TABLE IF NOT EXISTS users (
  max_user_id TEXT PRIMARY KEY,
  email TEXT,
  consent_at TIMESTAMPTZ,
  available_minutes INTEGER NOT NULL DEFAULT 0 CHECK (available_minutes >= 0),
  active_until TIMESTAMPTZ,
  request_quota INTEGER NOT NULL DEFAULT 0 CHECK (request_quota >= 0),
  requests_used INTEGER NOT NULL DEFAULT 0 CHECK (requests_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  max_user_id TEXT NOT NULL REFERENCES users(max_user_id),
  plan_id TEXT NOT NULL,
  price_kopecks INTEGER NOT NULL CHECK (price_kopecks > 0),
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  provider_payment_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS activations (
  id BIGSERIAL PRIMARY KEY,
  max_user_id TEXT NOT NULL REFERENCES users(max_user_id),
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_until TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  max_user_id TEXT NOT NULL REFERENCES users(max_user_id),
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_user_id_id_idx ON messages(max_user_id, id DESC);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(max_user_id, created_at DESC);
