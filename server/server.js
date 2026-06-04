/**
 * server.js — Backend del Kueski Smart Widget (versión final multiusuario)
 *
 * - Base de datos: MongoDB (Mongoose) — ver lib/db.js
 * - Auth: usuario + contraseña (bcrypt) → JWT HS256 (lib/jwt.js)
 * - Reglas y elegibilidad: lib/rules.js
 * - Cada endpoint opera sobre el usuario autenticado (req.userId).
 *
 * Env: MONGODB_URI, JWT_SECRET, PORT (default 3001), NODE_ENV.
 * Documentación de endpoints en docs/endpoints.md.
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const rules = require('./lib/rules');
const { issueTokens, verify, authMiddleware } = require('./lib/jwt');
const { connectDB, User, Purchase, Deal } = require('./lib/db');
const { seedDatabase } = require('./lib/seed');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Envuelve handlers async y centraliza el manejo de errores.
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((err) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Aplica beneficios de nivel (cashback y crédito) según los puntos. */
function applyLevel(user) {
  const benefits = rules.levelBenefits(user.level);
  user.cashbackRate = benefits.cashbackRate;
  user.creditLimit = benefits.creditLimit.max;
}

/** Perfil público del usuario para las respuestas de la API. */
function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.username,
    level: user.level,
    creditLimit: user.creditLimit,
    availableCredit: user.availableCredit,
    cashbackRate: user.cashbackRate,
    score: user.scorePoints,
    nextPayment: user.nextPayment,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  1. AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════════════════

/** POST /api/auth/login — Usuario + contraseña → tokens + perfil. */
app.post('/api/auth/login', h(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Se requieren usuario y contraseña' });
  }
  const user = await User.findOne({ username: String(username).toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  const tokens = issueTokens(user._id.toString());
  res.json({ ...tokens, user: publicUser(user) });
}));

/** POST /api/auth/logout — Cierra sesión (sin estado en el server). */
app.post('/api/auth/logout', authMiddleware, (_req, res) => {
  res.json({ ok: true });
});

/** POST /api/auth/refresh-token — Renueva el access token. */
app.post('/api/auth/refresh-token', (req, res) => {
  const { refreshToken } = req.body || {};
  const payload = verify(refreshToken);
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
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(publicUser(user));
}));

app.get('/api/user/preferences', authMiddleware, h(async (req, res) => {
  const user = await User.findById(req.userId);
  res.json(user.preferences);
}));

app.put('/api/user/preferences', authMiddleware, h(async (req, res) => {
  const { disabledSites, notifications } = req.body || {};
  const user = await User.findById(req.userId);
  if (disabledSites !== undefined) {
    if (!Array.isArray(disabledSites)) {
      return res.status(400).json({ error: 'disabledSites debe ser un arreglo' });
    }
    user.preferences.disabledSites = disabledSites;
  }
  if (notifications !== undefined) {
    user.preferences.notifications = { ...user.preferences.notifications, ...notifications };
  }
  await user.save();
  res.json({ ok: true, preferences: user.preferences });
}));

// ════════════════════════════════════════════════════════════════════════════
//  3. SCORE Y GAMIFICACIÓN
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/user/score', authMiddleware, h(async (req, res) => {
  const user = await User.findById(req.userId);
  const { nextLevel, pointsToNextLevel } = rules.nextLevelInfo(user.scorePoints);
  res.json({
    points: user.scorePoints,
    level: user.level,
    pointsToNextLevel,
    nextLevel,
    achievements: user.achievements,
  });
}));

app.put('/api/user/score', authMiddleware, h(async (req, res) => {
  const { points } = req.body || {};
  if (typeof points !== 'number' || points < 0) {
    return res.status(400).json({ error: 'Se requiere { points: number } positivo' });
  }
  const user = await User.findById(req.userId);
  const prevLevel = user.level;
  user.scorePoints = points;
  user.level = rules.computeLevel(points);
  applyLevel(user);
  await user.save();
  res.json({ ok: true, points: user.scorePoints, level: user.level, levelChanged: user.level !== prevLevel });
}));

app.post('/api/user/achievements/:achievementId/complete', authMiddleware, h(async (req, res) => {
  const user = await User.findById(req.userId);
  const achievement = user.achievements.find((a) => a.id === req.params.achievementId);
  if (!achievement) return res.status(400).json({ error: 'achievementId no reconocido' });
  if (achievement.completed) return res.status(409).json({ error: 'El logro ya fue completado previamente' });

  achievement.completed = true;
  user.scorePoints += achievement.points;
  user.level = rules.computeLevel(user.scorePoints);
  applyLevel(user);
  await user.save();
  res.json({ ok: true, achievement, pointsAwarded: achievement.points, newTotal: user.scorePoints });
}));

// ════════════════════════════════════════════════════════════════════════════
//  4. DEALS / PROMOCIONES
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/deals', authMiddleware, h(async (req, res) => {
  const { site } = req.query;
  const deals = await Deal.find({ active: true }).lean();
  res.json(deals.map((d) => ({
    id: d.id, site: d.site, title: d.title, description: d.description,
    discount: d.discount, tag: d.tag, color: d.color,
    isActive: site ? d.site === site : false,
  })));
}));

app.post('/api/deals/:dealId/subscribe', authMiddleware, h(async (req, res) => {
  const dealId = Number(req.params.dealId);
  const deal = await Deal.findOne({ id: dealId });
  if (!deal) return res.status(404).json({ error: 'Deal no encontrado' });
  const user = await User.findById(req.userId);
  if (!user.subscriptions.includes(dealId)) {
    user.subscriptions.push(dealId);
    await user.save();
  }
  res.json({ ok: true, dealId, subscribed: true });
}));

// ════════════════════════════════════════════════════════════════════════════
//  5. COMPRAS
// ════════════════════════════════════════════════════════════════════════════

/** POST /api/purchases/calculate-plans — Planes personalizados + elegibilidad. */
app.post('/api/purchases/calculate-plans', authMiddleware, h(async (req, res) => {
  const { cartTotal } = req.body || {};
  if (typeof cartTotal !== 'number' || cartTotal < 1) {
    return res.status(400).json({ error: 'cartTotal inválido o menor a $1' });
  }
  const user = await User.findById(req.userId);
  const purchases = await Purchase.find({ userId: user._id }).lean();
  const eligibility = rules.evaluateEligibility(user, cartTotal, purchases);
  const { plans } = rules.calculatePlans(cartTotal, user.level, user.availableCredit);
  res.json({
    approved: eligibility.approved,
    reason: eligibility.reason,
    message: eligibility.message,
    availableCredit: user.availableCredit,
    plans,
  });
}));

/** POST /api/purchases — Registra una compra elegible y baja el crédito. */
app.post('/api/purchases', authMiddleware, h(async (req, res) => {
  const { id, site, amount, plan, paymentPerPeriod, cashback, date, status } = req.body || {};
  if (!id || !site || amount == null || !plan) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id, site, amount, plan' });
  }
  if (await Purchase.findOne({ id })) {
    return res.status(409).json({ error: 'Compra ya registrada' });
  }

  const user = await User.findById(req.userId);
  const purchases = await Purchase.find({ userId: user._id }).lean();
  const eligibility = rules.evaluateEligibility(user, amount, purchases);
  if (!eligibility.approved) {
    return res.status(422).json({ error: eligibility.message, reason: eligibility.reason });
  }

  await Purchase.create({
    id,
    userId: user._id,
    site,
    amount,
    plan,
    paymentPerPeriod: paymentPerPeriod ?? amount / plan,
    cashback: cashback ?? rules.calculateCashback(amount, user.level),
    date: date ?? new Date().toISOString(),
    status: status ?? 'activo',
  });
  user.availableCredit = Math.max(0, user.availableCredit - amount);
  await user.save();
  res.status(201).json({ ok: true, id });
}));

app.get('/api/purchases', authMiddleware, h(async (req, res) => {
  const { status, site } = req.query;
  const filter = { userId: req.userId };
  if (status) filter.status = status;
  if (site) filter.site = site;
  const purchases = await Purchase.find(filter).sort({ date: -1 }).lean();
  res.json(purchases.map(serializePurchase));
}));

app.get('/api/purchases/:purchaseId', authMiddleware, h(async (req, res) => {
  const purchase = await Purchase.findOne({ id: req.params.purchaseId, userId: req.userId }).lean();
  if (!purchase) return res.status(404).json({ error: 'Compra no encontrada' });
  res.json(serializePurchase(purchase));
}));

app.put('/api/purchases/:purchaseId/status', authMiddleware, h(async (req, res) => {
  const { status } = req.body || {};
  if (!['activo', 'pagado', 'vencido'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido (activo | pagado | vencido)' });
  }
  const purchase = await Purchase.findOne({ id: req.params.purchaseId, userId: req.userId });
  if (!purchase) return res.status(404).json({ error: 'Compra no encontrada' });
  purchase.status = status;
  await purchase.save();
  res.json({ ok: true, id: purchase.id, status });
}));

function serializePurchase(p) {
  return {
    id: p.id, site: p.site, amount: p.amount, plan: p.plan,
    paymentPerPeriod: p.paymentPerPeriod, cashback: p.cashback,
    date: p.date, status: p.status,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  6. CASHBACK
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/user/cashback', authMiddleware, h(async (req, res) => {
  const purchases = await Purchase.find({ userId: req.userId, cashback: { $gt: 0 } }).lean();
  const history = purchases.map((p) => ({
    purchaseId: p.id, site: p.site, purchaseAmount: p.amount, cashbackAmount: p.cashback, date: p.date,
  }));
  const totalEarned = Math.round(history.reduce((s, h2) => s + h2.cashbackAmount, 0) * 100) / 100;
  res.json({ totalEarned, history });
}));

// ════════════════════════════════════════════════════════════════════════════
//  7. HEALTH CHECK
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────

async function start() {
  await connectDB();
  await seedDatabase();
  const server = app.listen(PORT, () => {
    console.log(`\n🟢 Kueski Widget Server (MongoDB) en http://localhost:${PORT}`);
    console.log(`   POST /api/auth/login  ·  usuarios demo: carlos/ana/diego/sofia/pedro (pass: kueski123)`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`\n🔴 Puerto ${PORT} en uso. lsof -ti:${PORT} | xargs kill -9`);
    else console.error('Error al iniciar:', err.message);
    process.exit(1);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  });
}

module.exports = { app, start };
