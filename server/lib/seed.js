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
  { id: 3, site: 'liverpool', title: 'Envio gratis con Kueski', description: 'Paga con Kueski Pay y obtén envío sin costo', discount: 'Envio gratis', tag: 'Beneficio', color: 'from-red-500 to-red-600', active: true },
  { id: 4, site: 'coppel', title: 'Hasta 6 MSI', description: 'Meses sin intereses en compras mayores a $1,500', discount: '6 MSI', tag: 'Disponible', color: 'from-blue-500 to-blue-600', active: true },
  { id: 5, site: 'elektra', title: 'Paga a plazos con 0% interes', description: 'Hasta 4 quincenas sin intereses en electronica y mas', discount: '0% interes', tag: 'Kueski Pay', color: 'from-red-600 to-pink-600', active: true },
];

// Logros comunes — cada usuario recibe una copia con su estado de completado.
const ALL_ACHIEVEMENT_IDS = rules.DEFAULT_ACHIEVEMENTS.map((a) => a.id);

// Definición de qué logros tiene completados cada usuario.
const COMPLETED_BY_USER = {
  carlos: [],
  ana:    ['on-time-payment', 'three-purchases'],
  diego:  ['on-time-payment', 'three-purchases', 'thirty-days'],
  sofia:  ALL_ACHIEVEMENT_IDS,
  pedro:  ['on-time-payment'],
};

const USERS = [
  { username: 'carlos', name: 'Carlos Mendoza', level: 'Bronce',  scorePoints: 250,  creditLimit: 2500,  availableCredit: 1950 },
  { username: 'ana',    name: 'Ana Torres',     level: 'Plata',   scorePoints: 800,  creditLimit: 8000,  availableCredit: 6000 },
  { username: 'diego',  name: 'Diego Ramirez',  level: 'Oro',     scorePoints: 2000, creditLimit: 15000, availableCredit: 12000 },
  { username: 'sofia',  name: 'Sofia Herrera',  level: 'Platino', scorePoints: 4500, creditLimit: 25000, availableCredit: 22000 },
  { username: 'pedro',  name: 'Pedro Gomez',    level: 'Plata',   scorePoints: 700,  creditLimit: 8000,  availableCredit: 5000, mora: true },
];

const DEMO_PASSWORD = 'kueski123';

async function seedDatabase(pool) {
  // Deals
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

  // Users
  const { rows: userCount } = await pool.query('SELECT COUNT(*) AS n FROM users');
  if (Number(userCount[0].n) === 0) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    for (const u of USERS) {
      const id = crypto.randomUUID();
      const completedIds = COMPLETED_BY_USER[u.username] || [];
      const achievements = JSON.stringify(
        rules.DEFAULT_ACHIEVEMENTS.map((a) => ({
          ...a,
          completed: completedIds.includes(a.id),
        }))
      );
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
          '2026-06-10', 649.5,
          achievements,
        ]
      );

      // Historial de compras por usuario.
      if (u.mora) {
        // pedro: compra vencida para demostrar el rechazo por mora.
        await pool.query(
          `INSERT INTO purchases (id, user_id, site, amount, plan, payment_per_period, cashback, date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          ['seed_pedro_vencida', id, 'coppel', 1200, 4, 300, 18, '2026-04-15T10:00:00.000Z', 'vencido']
        );
      } else if (u.username === 'carlos') {
        await pool.query(
          `INSERT INTO purchases (id, user_id, site, amount, plan, payment_per_period, cashback, date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          ['seed_carlos_1', id, 'amazon', 1200, 4, 300, 6, '2026-05-10T12:00:00.000Z', 'activo']
        );
      } else if (u.username === 'ana') {
        await pool.query(
          `INSERT INTO purchases (id, user_id, site, amount, plan, payment_per_period, cashback, date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          ['seed_ana_1', id, 'liverpool', 3500, 6, 583.34, 52.5, '2026-03-20T10:00:00.000Z', 'pagado']
        );
        await pool.query(
          `INSERT INTO purchases (id, user_id, site, amount, plan, payment_per_period, cashback, date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          ['seed_ana_2', id, 'mercadolibre', 2100, 4, 525, 31.5, '2026-05-18T15:00:00.000Z', 'activo']
        );
      } else if (u.username === 'diego') {
        await pool.query(
          `INSERT INTO purchases (id, user_id, site, amount, plan, payment_per_period, cashback, date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          ['seed_diego_1', id, 'amazon', 5800, 8, 736.13, 145, '2026-04-05T09:00:00.000Z', 'activo']
        );
        await pool.query(
          `INSERT INTO purchases (id, user_id, site, amount, plan, payment_per_period, cashback, date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          ['seed_diego_2', id, 'coppel', 4000, 6, 666.67, 100, '2026-05-01T11:00:00.000Z', 'activo']
        );
      } else if (u.username === 'sofia') {
        await pool.query(
          `INSERT INTO purchases (id, user_id, site, amount, plan, payment_per_period, cashback, date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          ['seed_sofia_1', id, 'liverpool', 12000, 12, 1015, 600, '2026-02-14T14:00:00.000Z', 'pagado']
        );
        await pool.query(
          `INSERT INTO purchases (id, user_id, site, amount, plan, payment_per_period, cashback, date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          ['seed_sofia_2', id, 'elektra', 8500, 8, 1078.75, 425, '2026-05-25T16:00:00.000Z', 'activo']
        );
      }
    }
    console.log(`[seed] ${USERS.length} usuarios sembrados (password: ${DEMO_PASSWORD})`);
  }
}

module.exports = { seedDatabase, DEMO_PASSWORD, USERS, DEALS };
