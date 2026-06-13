/**
 * server.js — Backend del Kueski Smart Widget (versión final multiusuario)
 *
 * - Base de datos: PostgreSQL (Aiven) vía driver `pg` — ver lib/db.js
 * - Auth: usuario + contraseña (bcrypt) → JWT HS256 (lib/jwt.js)
 * - Reglas y elegibilidad: lib/rules.js
 * - Cada endpoint opera sobre el usuario autenticado (req.userId).
 *
 * Env: DATABASE_URL, JWT_SECRET, PORT (default 3001), NODE_ENV.
 * Documentación de endpoints en docs/endpoints.md.
 */

const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');

const rules                               = require('./lib/rules');
const { issueTokens, verify, authMiddleware } = require('./lib/jwt');
const { connectDB, getPool, setPool, initSchema } = require('./lib/db');
const { seedDatabase }                    = require('./lib/seed');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Expone setPool para que los tests inyecten su pool de pg-mem.
app.setPool = setPool;

// ─── Envoltura async + manejo centralizado de errores ─────────────────────────
const h = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

// ─── Helpers de serialización JSON ───────────────────────────────────────────

function parseArr(v) { try { return JSON.parse(v || '[]'); } catch { return []; } }

/** Convierte una fila de la tabla `users` más compras al perfil público de la API. */
function publicUser(u, purchases = []) {
  const derived = rules.nextPaymentFrom(purchases);
  return {
    id:             u.id,
    name:           u.name,
    username:       u.username,
    email:          u.username,
    level:          u.level,
    creditLimit:    u.credit_limit,
    availableCredit:u.available_credit,
    cashbackRate:   u.cashback_rate,
    score:          u.score_points,
    nextPayment: derived ?? { date: u.next_payment_date, amount: u.next_payment_amount },
  };
}

/** Consulta las compras del usuario y devuelve su perfil con nextPayment derivado. */
async function publicUserWithPurchases(pool, userId) {
  const { rows: ur } = await pool.query('SELECT * FROM users WHERE id=$1', [userId]);
  if (!ur[0]) return null;
  const { rows: pr } = await pool.query('SELECT * FROM purchases WHERE user_id=$1', [userId]);
  return publicUser(ur[0], pr);
}

/** Aplica beneficios de nivel (cashback y crédito máximo) a los campos de la fila. */
function benefitsForLevel(level) {
  const b = rules.levelBenefits(level);
  return { cashback_rate: b.cashbackRate, credit_limit: b.creditLimit.max };
}

// ════════════════════════════════════════════════════════════════════════════
//  1. AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════════════════

/** POST /api/auth/login — usuario + contraseña → tokens + perfil */
app.post('/api/auth/login', h(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Se requieren usuario y contraseña' });
  }
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [String(username).toLowerCase().trim()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  const tokens = issueTokens(user.id);
  const { rows: pr } = await pool.query('SELECT * FROM purchases WHERE user_id=$1', [user.id]);
  res.json({ ...tokens, user: publicUser(user, pr) });
}));

/** POST /api/auth/logout */
app.post('/api/auth/logout', authMiddleware, (_req, res) => {
  res.json({ ok: true });
});

/** POST /api/auth/refresh-token */
app.post('/api/auth/refresh-token', (req, res) => {
  const payload = verify((req.body || {}).refreshToken);
  if (!payload || payload.type !== 'refresh') {
    return res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
  const tokens = issueTokens(payload.sub);
  res.json({ accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
});

// ════════════════════════════════════════════════════════════════════════════
//  2. USUARIO
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/user', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const profile = await publicUserWithPurchases(pool, req.userId);
  if (!profile) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(profile);
}));

app.get('/api/user/preferences', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT disabled_sites, notif_deals, notif_reminders FROM users WHERE id=$1',
    [req.userId]
  );
  const u = rows[0];
  res.json({ disabledSites: parseArr(u.disabled_sites), notifications: { deals: u.notif_deals, reminders: u.notif_reminders } });
}));

app.put('/api/user/preferences', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const { disabledSites, notifications } = req.body || {};
  const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.userId]);
  const u = rows[0];

  const newSites = disabledSites !== undefined
    ? (Array.isArray(disabledSites) ? JSON.stringify(disabledSites) : u.disabled_sites)
    : u.disabled_sites;
  if (disabledSites !== undefined && !Array.isArray(disabledSites)) {
    return res.status(400).json({ error: 'disabledSites debe ser un arreglo' });
  }
  const newDeals    = notifications?.deals    !== undefined ? notifications.deals    : u.notif_deals;
  const newReminders= notifications?.reminders !== undefined ? notifications.reminders : u.notif_reminders;

  await pool.query(
    'UPDATE users SET disabled_sites=$1, notif_deals=$2, notif_reminders=$3 WHERE id=$4',
    [newSites, newDeals, newReminders, req.userId]
  );
  res.json({ ok: true, preferences: { disabledSites: parseArr(newSites), notifications: { deals: newDeals, reminders: newReminders } } });
}));

// ════════════════════════════════════════════════════════════════════════════
//  3. SCORE Y GAMIFICACIÓN
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/user/score', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT score_points, level, achievements FROM users WHERE id=$1', [req.userId]);
  const u = rows[0];
  const { nextLevel, pointsToNextLevel } = rules.nextLevelInfo(u.score_points);
  res.json({ points: u.score_points, level: u.level, pointsToNextLevel, nextLevel, achievements: parseArr(u.achievements) });
}));

app.put('/api/user/score', authMiddleware, h(async (req, res) => {
  const { points } = req.body || {};
  if (typeof points !== 'number' || points < 0) {
    return res.status(400).json({ error: 'Se requiere { points: number } positivo' });
  }
  const pool = getPool();
  const { rows } = await pool.query('SELECT level FROM users WHERE id=$1', [req.userId]);
  const prevLevel = rows[0].level;
  const newLevel  = rules.computeLevel(points);
  const b         = benefitsForLevel(newLevel);
  await pool.query(
    'UPDATE users SET score_points=$1, level=$2, cashback_rate=$3, credit_limit=$4 WHERE id=$5',
    [points, newLevel, b.cashback_rate, b.credit_limit, req.userId]
  );
  res.json({ ok: true, points, level: newLevel, levelChanged: newLevel !== prevLevel });
}));

app.post('/api/user/achievements/:achievementId/complete', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT score_points, level, achievements FROM users WHERE id=$1', [req.userId]);
  const u = rows[0];
  const achievements = parseArr(u.achievements);
  const ach = achievements.find((a) => a.id === req.params.achievementId);

  if (!ach)          return res.status(400).json({ error: 'achievementId no reconocido' });
  if (ach.completed) return res.status(409).json({ error: 'El logro ya fue completado previamente' });

  ach.completed = true;
  const newPoints = u.score_points + ach.points;
  const newLevel  = rules.computeLevel(newPoints);
  const b         = benefitsForLevel(newLevel);
  await pool.query(
    'UPDATE users SET achievements=$1, score_points=$2, level=$3, cashback_rate=$4, credit_limit=$5 WHERE id=$6',
    [JSON.stringify(achievements), newPoints, newLevel, b.cashback_rate, b.credit_limit, req.userId]
  );
  res.json({ ok: true, achievement: ach, pointsAwarded: ach.points, newTotal: newPoints });
}));

// ════════════════════════════════════════════════════════════════════════════
//  4. DEALS / PROMOCIONES
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/deals', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM deals WHERE active = true');
  const { site } = req.query;
  res.json(rows.map((d) => ({
    id: d.id, site: d.site, title: d.title, description: d.description,
    discount: d.discount, tag: d.tag, color: d.color,
    discountType: d.discount_type ?? null,
    discountValue: d.discount_value ?? 0,
    isActive: site ? d.site === site : false,
  })));
}));

app.post('/api/deals/:dealId/subscribe', authMiddleware, h(async (req, res) => {
  const pool   = getPool();
  const dealId = Number(req.params.dealId);
  const { rows: dr } = await pool.query('SELECT id FROM deals WHERE id=$1', [dealId]);
  if (!dr[0]) return res.status(404).json({ error: 'Deal no encontrado' });

  const { rows: ur } = await pool.query('SELECT subscriptions FROM users WHERE id=$1', [req.userId]);
  const subs = parseArr(ur[0].subscriptions);
  if (!subs.includes(dealId)) {
    subs.push(dealId);
    await pool.query('UPDATE users SET subscriptions=$1 WHERE id=$2', [JSON.stringify(subs), req.userId]);
  }
  res.json({ ok: true, dealId, subscribed: true });
}));

// ════════════════════════════════════════════════════════════════════════════
//  5. COMPRAS
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/purchases/calculate-plans', authMiddleware, h(async (req, res) => {
  const { cartTotal, site } = req.body || {};
  if (typeof cartTotal !== 'number' || cartTotal < 1) {
    return res.status(400).json({ error: 'cartTotal inválido o menor a $1' });
  }
  const pool = getPool();
  const { rows: ur } = await pool.query('SELECT level, available_credit FROM users WHERE id=$1', [req.userId]);
  const { rows: pr } = await pool.query('SELECT status FROM purchases WHERE user_id=$1', [req.userId]);
  const u = ur[0];
  const eligibility = rules.evaluateEligibility({ availableCredit: u.available_credit }, cartTotal, pr);

  // Buscar deal activo del sitio (si se envía `site` en el body).
  let dealRow = null;
  if (site) {
    const { rows: dr } = await pool.query(
      'SELECT * FROM deals WHERE site=$1 AND active=true LIMIT 1',
      [site]
    );
    dealRow = dr[0] ?? null;
  }

  let plans, cashback, effectiveTotal, appliedDeal;
  if (dealRow && dealRow.discount_type) {
    ({ plans, cashback, effectiveTotal, appliedDeal } = rules.applyDeal(dealRow, cartTotal, u.level, u.available_credit));
  } else {
    ({ plans } = rules.calculatePlans(cartTotal, u.level, u.available_credit));
    cashback = rules.calculateCashback(cartTotal, u.level);
    effectiveTotal = cartTotal;
    appliedDeal = null;
  }

  res.json({
    approved: eligibility.approved,
    reason: eligibility.reason,
    message: eligibility.message,
    availableCredit: u.available_credit,
    effectiveTotal,
    cashback,
    appliedDeal,
    plans,
  });
}));

app.post('/api/purchases', authMiddleware, h(async (req, res) => {
  const { id, site, amount, plan, paymentPerPeriod, cashback, date, status, dealId } = req.body || {};
  if (!id || !site || amount == null || !plan) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id, site, amount, plan' });
  }
  const pool = getPool();
  const { rows: dup } = await pool.query('SELECT id FROM purchases WHERE id=$1', [id]);
  if (dup[0]) return res.status(409).json({ error: 'Compra ya registrada' });

  const { rows: ur } = await pool.query('SELECT level, available_credit, cashback_rate FROM users WHERE id=$1', [req.userId]);
  const { rows: pr } = await pool.query('SELECT status FROM purchases WHERE user_id=$1', [req.userId]);
  const u = ur[0];
  const eligibility = rules.evaluateEligibility({ availableCredit: u.available_credit }, amount, pr);
  if (!eligibility.approved) {
    return res.status(422).json({ error: eligibility.message, reason: eligibility.reason });
  }

  const finalCashback = cashback ?? rules.calculateCashback(amount, u.level);
  await pool.query(
    `INSERT INTO purchases (id, user_id, site, amount, plan, payment_per_period, cashback, date, status, deal_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, req.userId, site, amount, plan, paymentPerPeriod ?? amount / plan,
     finalCashback, date ?? new Date().toISOString(), status ?? 'activo', dealId ?? null]
  );
  await pool.query(
    'UPDATE users SET available_credit = GREATEST(0, available_credit - $1) WHERE id=$2',
    [amount, req.userId]
  );
  res.status(201).json({ ok: true, id });
}));

app.get('/api/purchases', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const { status, site } = req.query;
  let q = 'SELECT * FROM purchases WHERE user_id=$1';
  const params = [req.userId];
  if (status) { q += ` AND status=$${params.push(status)}`; }
  if (site)   { q += ` AND site=$${params.push(site)}`; }
  q += ' ORDER BY date DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows.map(serializePurchase));
}));

app.get('/api/purchases/:purchaseId', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM purchases WHERE id=$1 AND user_id=$2', [req.params.purchaseId, req.userId]);
  if (!rows[0]) return res.status(404).json({ error: 'Compra no encontrada' });
  res.json(serializePurchase(rows[0]));
}));

app.put('/api/purchases/:purchaseId/status', authMiddleware, h(async (req, res) => {
  const { status } = req.body || {};
  if (!['activo', 'pagado', 'vencido'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido (activo | pagado | vencido)' });
  }
  const pool = getPool();
  const { rows } = await pool.query('SELECT id FROM purchases WHERE id=$1 AND user_id=$2', [req.params.purchaseId, req.userId]);
  if (!rows[0]) return res.status(404).json({ error: 'Compra no encontrada' });
  await pool.query('UPDATE purchases SET status=$1 WHERE id=$2', [status, req.params.purchaseId]);
  res.json({ ok: true, id: req.params.purchaseId, status });
}));

function serializePurchase(p) {
  return { id: p.id, site: p.site, amount: p.amount, plan: p.plan,
           paymentPerPeriod: p.payment_per_period, cashback: p.cashback,
           date: p.date, status: p.status, dealId: p.deal_id ?? null,
           installmentsPaid: p.installments_paid ?? 0 };
}

// ════════════════════════════════════════════════════════════════════════════
//  6. CALENDARIO DE PAGOS
// ════════════════════════════════════════════════════════════════════════════

/** GET /api/user/payments/upcoming — próximos pagos pendientes del usuario */
app.get('/api/user/payments/upcoming', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM purchases WHERE user_id=$1', [req.userId]);
  const schedule = rules.buildPaymentSchedule(rows);
  res.json(schedule);
}));

/** POST /api/purchases/:purchaseId/pay-installment — paga la siguiente quincena */
app.post('/api/purchases/:purchaseId/pay-installment', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const { rows: pr } = await pool.query(
    'SELECT * FROM purchases WHERE id=$1 AND user_id=$2',
    [req.params.purchaseId, req.userId]
  );
  const purchase = pr[0];
  if (!purchase) return res.status(404).json({ error: 'Compra no encontrada' });
  if (purchase.status !== 'activo') return res.status(409).json({ error: 'La compra no está activa' });
  const paid = (purchase.installments_paid ?? 0);
  if (paid >= purchase.plan) return res.status(409).json({ error: 'Todos los pagos ya fueron realizados' });

  const newPaid = paid + 1;
  const newStatus = newPaid >= purchase.plan ? 'pagado' : 'activo';

  await pool.query(
    'UPDATE purchases SET installments_paid=$1, status=$2 WHERE id=$3',
    [newPaid, newStatus, purchase.id]
  );

  // Restaurar crédito al usuario (tope: credit_limit)
  const { rows: ur } = await pool.query(
    'UPDATE users SET available_credit = LEAST(credit_limit, available_credit + $1) WHERE id=$2 RETURNING available_credit',
    [purchase.payment_per_period, req.userId]
  );

  const updatedPurchase = { ...serializePurchase(purchase), installmentsPaid: newPaid, status: newStatus };
  const { rows: allPr } = await pool.query('SELECT * FROM purchases WHERE user_id=$1', [req.userId]);
  const nextPayment = rules.nextPaymentFrom(allPr);

  res.json({
    ok: true,
    purchase: updatedPurchase,
    availableCredit: ur[0]?.available_credit,
    nextPayment,
  });
}));

// ════════════════════════════════════════════════════════════════════════════
//  7. CASHBACK
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/user/cashback', authMiddleware, h(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM purchases WHERE user_id=$1 AND cashback > 0', [req.userId]);
  const history = rows.map((p) => ({ purchaseId: p.id, site: p.site, purchaseAmount: p.amount, cashbackAmount: p.cashback, date: p.date }));
  const totalEarned = Math.round(history.reduce((s, h2) => s + h2.cashbackAmount, 0) * 100) / 100;
  res.json({ totalEarned, history });
}));

// ════════════════════════════════════════════════════════════════════════════
//  8. HEALTH CHECK
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────

async function start() {
  const pool = await connectDB();
  await initSchema(pool);
  await seedDatabase(pool);
  app.listen(PORT, () => {
    console.log(`\n🟢 Kueski Widget Server (PostgreSQL) en http://localhost:${PORT}`);
    console.log(`   POST /api/auth/login  ·  usuarios demo: carlos/ana/diego/sofia/pedro (pass: kueski123)`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  });
}

module.exports = { app, start, setPool };
