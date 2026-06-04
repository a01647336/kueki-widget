/**
 * server.js — Backend del Kueski Smart Widget
 *
 * Tecnologías: Express.js + base de datos JSON en archivo (sin dependencias nativas).
 * Auth: JWT simulado (HS256) — ver lib/jwt.js. OTP de demo: cualquier código de 6 dígitos.
 * Reglas de negocio (score → nivel → beneficios): lib/rules.js.
 *
 * Puerto:  process.env.PORT  (default 3001)
 * DB:      process.env.DB_FILE (default kueski_db.json) — configurable para tests.
 *
 * Documentación completa de endpoints en docs/endpoints.md.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const rules = require('./lib/rules');
const { issueTokens, verify, authMiddleware } = require('./lib/jwt');

// ─── Configuración ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'kueski_db.json');
const OTP_TTL = 300; // 5 minutos

const app = express();
app.use(cors());
app.use(express.json());

// ─── Motor de base de datos JSON ─────────────────────────────────────────────

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Datos iniciales (seed) ───────────────────────────────────────────────────

const INITIAL_DB = {
  users: [
    {
      id: 1,
      name: 'Carlos Mendoza',
      email: 'carlos.mendoza@example.com',
      level: 'Bronce',
      creditLimit: 2500,
      availableCredit: 1950,
      cashbackRate: 0.005,
      scorePoints: 250,
      nextPaymentAmount: 649.5,
      nextPaymentDate: '2026-06-01',
      preferences: {
        disabledSites: [],
        notifications: { deals: true, reminders: true },
      },
      achievements: rules.DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a })),
      subscriptions: [],
    },
  ],
  deals: [
    { id: 1, site: 'amazon', title: 'Pago diferido disponible', description: 'Compra ahora y paga en 4 quincenas sin intereses', discount: 'Sin intereses', tag: 'Kueski Pay', color: 'from-orange-500 to-orange-600', active: true },
    { id: 2, site: 'mercadolibre', title: '3 MSI + Cashback 5%', description: 'Meses sin intereses + reembolso en tu siguiente compra', discount: '5% cashback', tag: 'Oferta especial', color: 'from-yellow-400 to-yellow-500', active: true },
    { id: 3, site: 'liverpool', title: 'Envío gratis con Kueski', description: 'Paga con Kueski Pay y obtén envío sin costo', discount: 'Envío gratis', tag: 'Beneficio', color: 'from-red-500 to-red-600', active: true },
    { id: 4, site: 'coppel', title: 'Hasta 6 MSI', description: 'Meses sin intereses en compras mayores a $1,500', discount: '6 MSI', tag: 'Disponible', color: 'from-blue-500 to-blue-600', active: true },
    { id: 5, site: 'elektra', title: 'Paga a plazos con 0% interés', description: 'Hasta 4 quincenas sin intereses en electrónica y más', discount: '0% interés', tag: 'Kueski Pay', color: 'from-red-600 to-pink-600', active: true },
  ],
  purchases: [],
};

// Inicializar DB si no existe.
let db = loadDB();
if (!db) {
  db = INITIAL_DB;
  saveDB(db);
}

// Almacén de códigos OTP en memoria: identifier → { code, expiresAt }.
const otpStore = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Devuelve el usuario del demo (id=1) recargando la DB del disco. */
function getUser() {
  db = loadDB() || db;
  return db.users.find((u) => u.id === 1);
}

/** Aplica beneficios de nivel al usuario (cashback y crédito según puntos). */
function applyLevel(user) {
  const benefits = rules.levelBenefits(user.level);
  user.cashbackRate = benefits.cashbackRate;
  user.creditLimit = benefits.creditLimit.max;
}

/** Serializa el perfil público del usuario para las respuestas de la API. */
function publicUser(user) {
  return {
    id: `u_${String(user.id).padStart(3, '0')}`,
    name: user.name,
    email: user.email,
    level: user.level,
    creditLimit: user.creditLimit,
    availableCredit: user.availableCredit,
    cashbackRate: user.cashbackRate,
    score: user.scorePoints,
    nextPayment: { date: user.nextPaymentDate, amount: user.nextPaymentAmount },
  };
}

function isValidIdentifier(identifier) {
  if (typeof identifier !== 'string') return false;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isPhone = /^\d{10}$/.test(identifier);
  return isEmail || isPhone;
}

// ════════════════════════════════════════════════════════════════════════════
//  1. AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════════════════

/** POST /api/auth/send-otp — Envía un código de 6 dígitos (simulado). */
app.post('/api/auth/send-otp', (req, res) => {
  const { identifier } = req.body;
  if (!isValidIdentifier(identifier)) {
    return res.status(400).json({ error: 'Identificador con formato inválido' });
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  otpStore.set(identifier, { code, expiresAt: Date.now() + OTP_TTL * 1000 });

  const response = { ok: true, expiresIn: OTP_TTL };
  // En el demo exponemos el código para poder probar sin SMS/email reales.
  if (process.env.NODE_ENV !== 'production') response.devCode = code;
  res.json(response);
});

/** POST /api/auth/verify-otp — Valida el código y emite tokens + perfil. */
app.post('/api/auth/verify-otp', (req, res) => {
  const { identifier, code } = req.body;
  if (!isValidIdentifier(identifier) || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código con formato inválido' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
  }

  // Demo: aceptamos cualquier código de 6 dígitos. Si existe un OTP generado,
  // validamos su expiración para ejercitar el flujo de error 410.
  const stored = otpStore.get(identifier);
  if (stored && Date.now() > stored.expiresAt) {
    otpStore.delete(identifier);
    return res.status(410).json({ error: 'Código expirado' });
  }
  otpStore.delete(identifier);

  db = loadDB() || db;
  const user = db.users.find((u) => u.id === 1);
  user.email = identifier; // el usuario inicia sesión con su identificador
  saveDB(db);

  const tokens = issueTokens(user.id);
  res.json({ ...tokens, user: publicUser(user) });
});

/** POST /api/auth/logout — Invalida la sesión (no-op en el demo). */
app.post('/api/auth/logout', authMiddleware, (_req, res) => {
  res.json({ ok: true });
});

/** POST /api/auth/refresh-token — Renueva el access token. */
app.post('/api/auth/refresh-token', (req, res) => {
  const { refreshToken } = req.body;
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

/** GET /api/user — Perfil del usuario autenticado. */
app.get('/api/user', authMiddleware, (_req, res) => {
  const user = getUser();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(publicUser(user));
});

/** GET /api/user/preferences — Preferencias del usuario. */
app.get('/api/user/preferences', authMiddleware, (_req, res) => {
  const user = getUser();
  res.json(user.preferences);
});

/** PUT /api/user/preferences — Actualiza preferencias (merge parcial). */
app.put('/api/user/preferences', authMiddleware, (req, res) => {
  const { disabledSites, notifications } = req.body || {};
  db = loadDB() || db;
  const user = db.users.find((u) => u.id === 1);

  if (disabledSites !== undefined) {
    if (!Array.isArray(disabledSites)) {
      return res.status(400).json({ error: 'disabledSites debe ser un arreglo' });
    }
    user.preferences.disabledSites = disabledSites;
  }
  if (notifications !== undefined) {
    user.preferences.notifications = { ...user.preferences.notifications, ...notifications };
  }
  saveDB(db);
  res.json({ ok: true, preferences: user.preferences });
});

// ════════════════════════════════════════════════════════════════════════════
//  3. SCORE Y GAMIFICACIÓN
// ════════════════════════════════════════════════════════════════════════════

/** GET /api/user/score — Estado del Score Coach. */
app.get('/api/user/score', authMiddleware, (_req, res) => {
  const user = getUser();
  const { nextLevel, pointsToNextLevel } = rules.nextLevelInfo(user.scorePoints);
  res.json({
    points: user.scorePoints,
    level: user.level,
    pointsToNextLevel,
    nextLevel,
    achievements: user.achievements,
  });
});

/** PUT /api/user/score — Suma puntos y recalcula nivel/beneficios. */
app.put('/api/user/score', authMiddleware, (req, res) => {
  const { points } = req.body;
  if (typeof points !== 'number' || points < 0) {
    return res.status(400).json({ error: 'Se requiere { points: number } positivo' });
  }

  db = loadDB() || db;
  const user = db.users.find((u) => u.id === 1);
  const prevLevel = user.level;

  user.scorePoints = points;
  user.level = rules.computeLevel(points);
  applyLevel(user);
  saveDB(db);

  res.json({ ok: true, points: user.scorePoints, level: user.level, levelChanged: user.level !== prevLevel });
});

/** POST /api/user/achievements/:achievementId/complete — Completa un logro. */
app.post('/api/user/achievements/:achievementId/complete', authMiddleware, (req, res) => {
  const { achievementId } = req.params;
  db = loadDB() || db;
  const user = db.users.find((u) => u.id === 1);
  const achievement = user.achievements.find((a) => a.id === achievementId);

  if (!achievement) {
    return res.status(400).json({ error: 'achievementId no reconocido' });
  }
  if (achievement.completed) {
    return res.status(409).json({ error: 'El logro ya fue completado previamente' });
  }

  achievement.completed = true;
  user.scorePoints += achievement.points;
  user.level = rules.computeLevel(user.scorePoints);
  applyLevel(user);
  saveDB(db);

  res.json({ ok: true, achievement, pointsAwarded: achievement.points, newTotal: user.scorePoints });
});

// ════════════════════════════════════════════════════════════════════════════
//  4. DEALS / PROMOCIONES
// ════════════════════════════════════════════════════════════════════════════

/** GET /api/deals?site=amazon — Ofertas activas (marca la del sitio actual). */
app.get('/api/deals', authMiddleware, (req, res) => {
  const { site } = req.query;
  db = loadDB() || db;
  const deals = db.deals
    .filter((d) => d.active)
    .map((d) => ({
      id: d.id,
      site: d.site,
      title: d.title,
      description: d.description,
      discount: d.discount,
      tag: d.tag,
      color: d.color,
      isActive: site ? d.site === site : false,
    }));
  res.json(deals);
});

/** POST /api/deals/:dealId/subscribe — Suscribe a alertas de un deal. */
app.post('/api/deals/:dealId/subscribe', authMiddleware, (req, res) => {
  const dealId = Number(req.params.dealId);
  db = loadDB() || db;
  const deal = db.deals.find((d) => d.id === dealId);
  if (!deal) return res.status(404).json({ error: 'Deal no encontrado' });

  const user = db.users.find((u) => u.id === 1);
  if (!user.subscriptions.includes(dealId)) user.subscriptions.push(dealId);
  saveDB(db);

  res.json({ ok: true, dealId, subscribed: true });
});

// ════════════════════════════════════════════════════════════════════════════
//  5. COMPRAS
// ════════════════════════════════════════════════════════════════════════════

/** POST /api/purchases/calculate-plans — Planes personalizados por usuario. */
app.post('/api/purchases/calculate-plans', authMiddleware, (req, res) => {
  const { cartTotal } = req.body;
  if (typeof cartTotal !== 'number' || cartTotal < 1) {
    return res.status(400).json({ error: 'cartTotal inválido o menor a $1' });
  }
  const user = getUser();
  const result = rules.calculatePlans(cartTotal, user.level, user.availableCredit);
  res.json(result);
});

/** POST /api/purchases — Registra una compra y baja el crédito disponible. */
app.post('/api/purchases', authMiddleware, (req, res) => {
  const { id, site, amount, plan, paymentPerPeriod, cashback, date, status } = req.body;
  if (!id || !site || amount == null || !plan) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id, site, amount, plan' });
  }

  db = loadDB() || db;
  if (db.purchases.find((p) => p.id === id)) {
    return res.status(409).json({ error: 'Compra ya registrada' });
  }

  const user = db.users.find((u) => u.id === 1);
  const newPurchase = {
    id,
    site,
    amount,
    plan,
    paymentPerPeriod: paymentPerPeriod ?? amount / plan,
    cashback: cashback ?? rules.calculateCashback(amount, user.level),
    date: date ?? new Date().toISOString(),
    status: status ?? 'activo',
  };
  db.purchases.push(newPurchase);
  user.availableCredit = Math.max(0, user.availableCredit - amount);
  saveDB(db);

  res.status(201).json({ ok: true, id });
});

/** GET /api/purchases?status=&site= — Historial de compras (filtros opcionales). */
app.get('/api/purchases', authMiddleware, (req, res) => {
  const { status, site } = req.query;
  db = loadDB() || db;
  let purchases = [...db.purchases];
  if (status) purchases = purchases.filter((p) => p.status === status);
  if (site) purchases = purchases.filter((p) => p.site === site);
  purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(purchases);
});

/** GET /api/purchases/:purchaseId — Detalle de una compra. */
app.get('/api/purchases/:purchaseId', authMiddleware, (req, res) => {
  db = loadDB() || db;
  const purchase = db.purchases.find((p) => p.id === req.params.purchaseId);
  if (!purchase) return res.status(404).json({ error: 'Compra no encontrada' });
  res.json(purchase);
});

/** PUT /api/purchases/:purchaseId/status — Actualiza el estado de una compra. */
app.put('/api/purchases/:purchaseId/status', authMiddleware, (req, res) => {
  const { status } = req.body;
  if (status !== 'activo' && status !== 'pagado') {
    return res.status(400).json({ error: 'Estado inválido (activo | pagado)' });
  }
  db = loadDB() || db;
  const purchase = db.purchases.find((p) => p.id === req.params.purchaseId);
  if (!purchase) return res.status(404).json({ error: 'Compra no encontrada' });

  purchase.status = status;
  saveDB(db);
  res.json({ ok: true, id: purchase.id, status });
});

// ════════════════════════════════════════════════════════════════════════════
//  6. CASHBACK
// ════════════════════════════════════════════════════════════════════════════

/** GET /api/user/cashback — Cashback total acumulado y detalle por compra. */
app.get('/api/user/cashback', authMiddleware, (_req, res) => {
  db = loadDB() || db;
  const history = db.purchases
    .filter((p) => p.cashback > 0)
    .map((p) => ({
      purchaseId: p.id,
      site: p.site,
      purchaseAmount: p.amount,
      cashbackAmount: p.cashback,
      date: p.date,
    }));
  const totalEarned = Math.round(history.reduce((sum, h) => sum + h.cashbackAmount, 0) * 100) / 100;
  res.json({ totalEarned, history });
});

// ════════════════════════════════════════════════════════════════════════════
//  7. HEALTH CHECK
// ════════════════════════════════════════════════════════════════════════════

/** GET /api/health — Verifica que el servidor esté activo (sin auth). */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n🟢 Kueski Widget Server corriendo en http://localhost:${PORT}`);
    console.log(`   GET  /api/health`);
    console.log(`   POST /api/auth/send-otp · /api/auth/verify-otp`);
    console.log(`   GET  /api/user · /api/user/score · /api/user/cashback`);
    console.log(`   POST /api/purchases/calculate-plans · /api/purchases\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n🔴 Error: el puerto ${PORT} ya está en uso.`);
      console.error(`   lsof -ti:${PORT} | xargs kill -9\n`);
    } else {
      console.error('Error al iniciar el servidor:', err.message);
    }
    process.exit(1);
  });
}

module.exports = { app, loadDB, saveDB, INITIAL_DB };
