/**
 * server.js — Backend del Kueski Smart Widget
 * Tecnologías: Express.js + base de datos JSON en archivo (sin dependencias nativas)
 * Puerto: 3001
 * DB: kueski_db.json (generado automáticamente)
 *
 * Endpoints:
 *   GET  /api/user              → Datos del usuario autenticado
 *   PUT  /api/user/score        → Actualizar puntos del Score Coach
 *   GET  /api/deals?site=amazon → Ofertas activas (filtradas por sitio)
 *   GET  /api/purchases         → Historial de compras
 *   POST /api/purchases         → Registrar nueva compra
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

// ─── Configuración ────────────────────────────────────────────────────────────

const PORT    = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'kueski_db.json');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Motor de base de datos JSON ─────────────────────────────────────────────

/**
 * Carga la base de datos desde el archivo JSON.
 * Si no existe, devuelve la estructura inicial con datos de seed.
 */
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Guarda la base de datos en el archivo JSON.
 */
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Datos iniciales (seed) ───────────────────────────────────────────────────

const INITIAL_DB = {
  users: [
    {
      id:                 1,
      name:               'Carlos Mendoza',
      email:              'carlos.mendoza@example.com',
      level:              'Bronce',
      creditLimit:        2500,
      availableCredit:    1950,
      cashbackRate:       0.005,
      scorePoints:        200,
      nextPaymentAmount:  250,
      nextPaymentDate:    '2026-06-01',
    },
  ],
  deals: [
    {
      id: 1, site: 'amazon',
      title: 'Pago diferido disponible',
      description: 'Compra ahora y paga en 4 quincenas sin intereses',
      discount: 'Sin intereses', tag: 'Kueski Pay',
      color: 'from-orange-500 to-orange-600', active: true,
    },
    {
      id: 2, site: 'mercadolibre',
      title: '3 MSI + Cashback 5%',
      description: 'Meses sin intereses + reembolso en tu siguiente compra',
      discount: '5% cashback', tag: 'Oferta especial',
      color: 'from-yellow-400 to-yellow-500', active: true,
    },
    {
      id: 3, site: 'liverpool',
      title: 'Envío gratis con Kueski',
      description: 'Paga con Kueski Pay y obtén envío sin costo',
      discount: 'Envío gratis', tag: 'Beneficio',
      color: 'from-red-500 to-red-600', active: true,
    },
    {
      id: 4, site: 'coppel',
      title: 'Hasta 6 MSI',
      description: 'Meses sin intereses en compras mayores a $1,500',
      discount: '6 MSI', tag: 'Disponible',
      color: 'from-blue-500 to-blue-600', active: true,
    },
    {
      id: 5, site: 'elektra',
      title: 'Paga a plazos con 0% interés',
      description: 'Hasta 4 quincenas sin intereses en electrónica y más',
      discount: '0% interés', tag: 'Kueski Pay',
      color: 'from-red-600 to-pink-600', active: true,
    },
  ],
  purchases: [],
};

// Inicializar DB si no existe
let db = loadDB();
if (!db) {
  db = INITIAL_DB;
  saveDB(db);
  console.log('[DB] Base de datos creada con datos iniciales → kueski_db.json');
}

// ─── Rutas ────────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/user
 * Retorna los datos del usuario (siempre id=1 para el demo).
 */
app.get('/api/user', (req, res) => {
  db = loadDB();
  const user = db.users.find((u) => u.id === 1);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  res.json({
    id:              user.id,
    name:            user.name,
    email:           user.email,
    level:           user.level,
    creditLimit:     user.creditLimit,
    availableCredit: user.availableCredit,
    cashbackRate:    user.cashbackRate,
    score:           user.scorePoints,
    nextPayment: {
      amount: user.nextPaymentAmount,
      date:   user.nextPaymentDate,
    },
  });
});

/**
 * PUT /api/user/score
 * Body: { points: number }
 * Actualiza los puntos y el nivel del Score Coach.
 */
app.put('/api/user/score', (req, res) => {
  const { points } = req.body;
  if (typeof points !== 'number') {
    return res.status(400).json({ error: 'Se requiere { points: number }' });
  }

  // Calcular nivel basado en puntos
  let level = 'Bronce';
  let cashbackRate = 0.005;
  if (points >= 4000)      { level = 'Platino'; cashbackRate = 0.05; }
  else if (points >= 1500) { level = 'Oro';     cashbackRate = 0.025; }
  else if (points >= 500)  { level = 'Plata';   cashbackRate = 0.015; }

  db = loadDB();
  const userIdx = db.users.findIndex((u) => u.id === 1);
  if (userIdx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

  db.users[userIdx].scorePoints  = points;
  db.users[userIdx].level        = level;
  db.users[userIdx].cashbackRate = cashbackRate;
  saveDB(db);

  res.json({ ok: true, points, level });
});

/**
 * GET /api/deals?site=amazon
 * Retorna ofertas activas. Si se pasa ?site=X, marca cuál está activa en ese sitio.
 */
app.get('/api/deals', (req, res) => {
  const { site } = req.query;
  db = loadDB();
  const deals = db.deals
    .filter((d) => d.active)
    .map((d) => ({
      id:          d.id,
      site:        d.site,
      title:       d.title,
      description: d.description,
      discount:    d.discount,
      tag:         d.tag,
      color:       d.color,
      isActive:    site ? d.site === site : false,
    }));
  res.json(deals);
});

/**
 * GET /api/purchases
 * Retorna el historial de compras, ordenado por fecha desc.
 */
app.get('/api/purchases', (req, res) => {
  db = loadDB();
  const sorted = [...db.purchases].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  res.json(sorted);
});

/**
 * POST /api/purchases
 * Body: { id, site, amount, plan, paymentPerPeriod, cashback, date, status }
 * Registra una nueva compra y actualiza el crédito disponible.
 */
app.post('/api/purchases', (req, res) => {
  const { id, site, amount, plan, paymentPerPeriod, cashback, date, status } = req.body;

  if (!id || !site || amount == null || !plan) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id, site, amount, plan' });
  }

  db = loadDB();

  // Evitar duplicados
  if (db.purchases.find((p) => p.id === id)) {
    return res.status(409).json({ error: 'Compra ya registrada' });
  }

  const newPurchase = {
    id,
    site,
    amount,
    plan,
    paymentPerPeriod: paymentPerPeriod ?? amount / plan,
    cashback:         cashback ?? 0,
    date:             date ?? new Date().toISOString(),
    status:           status ?? 'activo',
  };

  db.purchases.push(newPurchase);

  // Reducir crédito disponible
  const userIdx = db.users.findIndex((u) => u.id === 1);
  if (userIdx !== -1) {
    db.users[userIdx].availableCredit = Math.max(
      0,
      db.users[userIdx].availableCredit - amount
    );
  }

  saveDB(db);
  res.status(201).json({ ok: true, id });
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`\n🟢 Kueski Widget Server corriendo en http://localhost:${PORT}`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/user`);
  console.log(`   GET  http://localhost:${PORT}/api/deals?site=amazon`);
  console.log(`   GET  http://localhost:${PORT}/api/purchases`);
  console.log(`   POST http://localhost:${PORT}/api/purchases\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n🔴 Error: el puerto ${PORT} ya está en uso.`);
    console.error(`   Cierra el proceso que lo usa con:`);
    console.error(`   lsof -ti:${PORT} | xargs kill -9\n`);
  } else {
    console.error('Error al iniciar el servidor:', err.message);
  }
  process.exit(1);
});
