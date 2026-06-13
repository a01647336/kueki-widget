/**
 * db.js — Pool de conexión y esquema de PostgreSQL (driver `pg` nativo).
 *
 * Tablas:
 *   - users      → cuentas con perfil, score, logros y preferencias
 *   - purchases  → compras por usuario
 *   - deals      → catálogo de promociones (seed estático)
 *
 * Los campos de tipo array/objeto (achievements, disabled_sites, subscriptions)
 * se almacenan como TEXT serializado en JSON para máxima compatibilidad con el
 * entorno de tests (pg-mem) y facilitar la lectura directa en el panel de Aiven.
 */

const { Pool } = require('pg');

let _pool = null;

/** Crea un pool nuevo (útil en tests para inyectar pg-mem). */
function createPool(connectionString) {
  const isLocal = !connectionString ||
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1');

  if (isLocal) {
    return new Pool({ connectionString, ssl: false });
  }

  // Para conexiones remotas (Aiven, etc.) quitamos sslmode de la URL y
  // manejamos SSL explícitamente con rejectUnauthorized:false.
  // Esto evita que pg v8+ interprete sslmode=require como verify-full.
  const cleanUrl = connectionString
    .replace(/[?&]sslmode=[^&]*/g, '')
    .replace(/\?$/, '')
    .replace(/&&/, '&')
    .replace(/\?&/, '?');

  return new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  });
}

/** Devuelve el pool global (o null si no se ha inicializado). */
function getPool() {
  return _pool;
}

/** Reemplaza el pool global (para inyección en tests). */
function setPool(pool) {
  _pool = pool;
}

/**
 * Conecta al servidor usando DATABASE_URL y almacena el pool globalmente.
 * Lanza si la variable no está definida.
 */
async function connectDB(url = process.env.DATABASE_URL) {
  if (!url) {
    throw new Error('DATABASE_URL no está definida. Configúrala en el entorno (.env / Aiven / Render).');
  }
  _pool = createPool(url);
  // Verifica que la conexión funcione antes de continuar.
  await _pool.query('SELECT 1');
  return _pool;
}

async function disconnectDB() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

/** Crea las tablas si no existen (idempotente, seguro de llamar en cada arranque). */
async function initSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                TEXT PRIMARY KEY,
      username          TEXT NOT NULL UNIQUE,
      password_hash     TEXT NOT NULL,
      name              TEXT,
      level             TEXT NOT NULL DEFAULT 'Bronce',
      credit_limit      REAL NOT NULL DEFAULT 2500,
      available_credit  REAL NOT NULL DEFAULT 2500,
      cashback_rate     REAL NOT NULL DEFAULT 0.005,
      score_points      INTEGER NOT NULL DEFAULT 0,
      next_payment_date TEXT,
      next_payment_amount REAL,
      disabled_sites    TEXT NOT NULL DEFAULT '[]',
      notif_deals       BOOLEAN NOT NULL DEFAULT true,
      notif_reminders   BOOLEAN NOT NULL DEFAULT true,
      subscriptions     TEXT NOT NULL DEFAULT '[]',
      achievements      TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      site                TEXT,
      amount              REAL,
      plan                INTEGER,
      payment_per_period  REAL,
      cashback            REAL DEFAULT 0,
      date                TEXT,
      status              TEXT NOT NULL DEFAULT 'activo'
        CHECK (status IN ('activo', 'pagado', 'vencido'))
    );

    CREATE TABLE IF NOT EXISTS deals (
      id             INTEGER PRIMARY KEY,
      site           TEXT,
      title          TEXT,
      description    TEXT,
      discount       TEXT,
      tag            TEXT,
      color          TEXT,
      active         BOOLEAN NOT NULL DEFAULT true,
      discount_type  TEXT,
      discount_value REAL NOT NULL DEFAULT 0
    );
  `);

  // Migraciones idempotentes para BD ya existente (Aiven no recrea tablas).
  await pool.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS discount_type  TEXT`);
  await pool.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS discount_value REAL NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS deal_id TEXT`);
  await pool.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS installments_paid INTEGER NOT NULL DEFAULT 0`);
}

module.exports = { createPool, getPool, setPool, connectDB, disconnectDB, initSchema };
