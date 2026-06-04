/**
 * seed.js — Datos iniciales: deals y usuarios predefinidos (SQL).
 * Solo siembra si las tablas están vacías (idempotente).
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rules = require('./rules');

const DEALS = [
  { id: 1, site: 'amazon', title: 'Pago diferido disponible', description: 'Compra ahora y paga en 4 quincenas sin intereses', discount: 'Sin intereses', tag: 'Kueski Pay', color: 'from-orange-500 to-orange-600', active: true },
  { id: 2, site: 'mercadolibre', title: '3 MSI + Cashback 5%', description: 'Meses sin intereses + reembolso en tu siguiente compra', discount: '5% cashback', tag: 'Oferta especial', color: 'from-yellow-400 to-yellow-500', active: true },
  { id: 3, site: 'liverpool', title: 'Envío gratis con Kueski', description: 'Paga con Kueski Pay y obtén envío sin costo', discount: 'Envío gratis', tag: 'Beneficio', color: 'from-red-500 to-red-600', active: true },
  { id: 4, site: 'coppel', title: 'Hasta 6 MSI', description: 'Meses sin intereses en compras mayores a $1,500', discount: '6 MSI', tag: 'Disponible', color: 'from-blue-500 to-blue-600', active: true },
  { id: 5, site: 'elektra', title: 'Paga a plazos con 0% interés', description: 'Hasta 4 quincenas sin intereses en electrónica y más', discount: '0% interés', tag: 'Kueski Pay', color: 'from-red-600 to-pink-600', active: true },
];

const USERS = [
  { username: 'carlos', name: 'Carlos Mendoza', level: 'Bronce',  scorePoints: 250,  creditLimit: 2500,  availableCredit: 1950 },
  { username: 'ana',    name: 'Ana Torres',     level: 'Plata',   scorePoints: 800,  creditLimit: 8000,  availableCredit: 6000 },
  { username: 'diego',  name: 'Diego Ramírez',  level: 'Oro',     scorePoints: 2000, creditLimit: 15000, availableCredit: 12000 },
  { username: 'sofia',  name: 'Sofía Herrera',  level: 'Platino', scorePoints: 4500, creditLimit: 25000, availableCredit: 22000 },
  { username: 'pedro',  name: 'Pedro Gómez',    level: 'Plata',   scorePoints: 700,  creditLimit: 8000,  availableCredit: 5000, mora: true },
];

const DEMO_PASSWORD = 'kueski123';

async function seedDatabase(pool) {
  const { rows: dealCount } = await pool.query('SELECT COUNT(*) AS n FROM deals');
  if (Number(dealCount[0].n) === 0) {
    for (const d of DEALS) {
      await pool.query(
        `INSERT INTO deals (id, site, title, description, discount, tag, color, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [d.id, d.site, d.title, d.description, d.discount, d.tag, d.color, d.active]
      );
    }
    console.log('[seed] Deals sembrados');
  }

  const { rows: userCount } = await pool.query('SELECT COUNT(*) AS n FROM users');
  if (Number(userCount[0].n) === 0) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    for (const u of USERS) {
      const id = crypto.randomUUID();
      const achievements = JSON.stringify(rules.DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a })));
      await pool.query(
        `INSERT INTO users
           (id, username, password_hash, name, level, credit_limit, available_credit,
            cashback_rate, score_points, next_payment_date, next_payment_amount, achievements)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          id, u.username, passwordHash, u.name, u.level,
          u.creditLimit, u.availableCredit,
          rules.LEVEL_CASHBACK_RATES[u.level],
          u.scorePoints,
          '2026-06-01', 649.5,
          achievements,
        ]
      );

      // pedro: una compra vencida para demostrar el rechazo por mora.
      if (u.mora) {
        await pool.query(
          `INSERT INTO purchases (id, user_id, site, amount, plan, payment_per_period, cashback, date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [`seed_pedro_vencida`, id, 'coppel', 1200, 4, 300, 18, '2026-04-15T10:00:00.000Z', 'vencido']
        );
      }
    }
    console.log(`[seed] ${USERS.length} usuarios sembrados (password: ${DEMO_PASSWORD})`);
  }
}

module.exports = { seedDatabase, DEMO_PASSWORD, USERS, DEALS };
