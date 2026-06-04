/**
 * seed.js — Datos iniciales: deals y usuarios predefinidos.
 * Solo siembra si las colecciones están vacías (idempotente).
 */

const bcrypt = require('bcryptjs');
const rules = require('./rules');
const { User, Purchase, Deal } = require('./db');

const DEALS = [
  { id: 1, site: 'amazon', title: 'Pago diferido disponible', description: 'Compra ahora y paga en 4 quincenas sin intereses', discount: 'Sin intereses', tag: 'Kueski Pay', color: 'from-orange-500 to-orange-600', active: true },
  { id: 2, site: 'mercadolibre', title: '3 MSI + Cashback 5%', description: 'Meses sin intereses + reembolso en tu siguiente compra', discount: '5% cashback', tag: 'Oferta especial', color: 'from-yellow-400 to-yellow-500', active: true },
  { id: 3, site: 'liverpool', title: 'Envío gratis con Kueski', description: 'Paga con Kueski Pay y obtén envío sin costo', discount: 'Envío gratis', tag: 'Beneficio', color: 'from-red-500 to-red-600', active: true },
  { id: 4, site: 'coppel', title: 'Hasta 6 MSI', description: 'Meses sin intereses en compras mayores a $1,500', discount: '6 MSI', tag: 'Disponible', color: 'from-blue-500 to-blue-600', active: true },
  { id: 5, site: 'elektra', title: 'Paga a plazos con 0% interés', description: 'Hasta 4 quincenas sin intereses en electrónica y más', discount: '0% interés', tag: 'Kueski Pay', color: 'from-red-600 to-pink-600', active: true },
];

// Usuarios de demo. La contraseña de todos es "kueski123".
const USERS = [
  { username: 'carlos', name: 'Carlos Mendoza', level: 'Bronce',  scorePoints: 250,  creditLimit: 2500,  availableCredit: 1950 },
  { username: 'ana',    name: 'Ana Torres',     level: 'Plata',   scorePoints: 800,  creditLimit: 8000,  availableCredit: 6000 },
  { username: 'diego',  name: 'Diego Ramírez',  level: 'Oro',     scorePoints: 2000, creditLimit: 15000, availableCredit: 12000 },
  { username: 'sofia',  name: 'Sofía Herrera',  level: 'Platino', scorePoints: 4500, creditLimit: 25000, availableCredit: 22000 },
  { username: 'pedro',  name: 'Pedro Gómez',    level: 'Plata',   scorePoints: 700,  creditLimit: 8000,  availableCredit: 5000, mora: true },
];

const DEMO_PASSWORD = 'kueski123';

async function seedDatabase() {
  // Deals
  if ((await Deal.countDocuments()) === 0) {
    await Deal.insertMany(DEALS);
    console.log('[seed] Deals sembrados');
  }

  // Users
  if ((await User.countDocuments()) === 0) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    for (const u of USERS) {
      const user = await User.create({
        username: u.username,
        passwordHash,
        name: u.name,
        level: u.level,
        creditLimit: u.creditLimit,
        availableCredit: u.availableCredit,
        cashbackRate: rules.LEVEL_CASHBACK_RATES[u.level],
        scorePoints: u.scorePoints,
        nextPayment: { date: '2026-06-01', amount: 649.5 },
        achievements: rules.DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a })),
      });

      // pedro tiene una compra vencida para demostrar el rechazo por mora.
      if (u.mora) {
        await Purchase.create({
          id: `seed_${u.username}_vencida`,
          userId: user._id,
          site: 'coppel',
          amount: 1200,
          plan: 4,
          paymentPerPeriod: 300,
          cashback: 18,
          date: '2026-04-15T10:00:00.000Z',
          status: 'vencido',
        });
      }
    }
    console.log(`[seed] ${USERS.length} usuarios sembrados (password: ${DEMO_PASSWORD})`);
  }
}

module.exports = { seedDatabase, DEMO_PASSWORD, USERS, DEALS };
