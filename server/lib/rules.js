/**
 * rules.js — Motor de reglas de negocio del Kueski Smart Widget
 *
 * Fuente ÚNICA de verdad para score → nivel → beneficios.
 * Debe mantenerse idéntico a `src/constants/kueski.ts` del frontend
 * para que el comportamiento online (backend) y offline (localStorage)
 * sea consistente.
 *
 * Tabla canónica:
 *
 * | Nivel   | Puntos      | Cashback | Crédito (MXN)     | Quincenas        | Comisión   |
 * |---------|-------------|----------|-------------------|------------------|------------|
 * | Bronce  | 0 – 499     | 0.5%     | $500 – $2,500     | 2, 4             | 0%         |
 * | Plata   | 500 – 1,499 | 1.5%     | $2,501 – $8,000   | 2, 4, 6          | 0%         |
 * | Oro     | 1,500–3,999 | 2.5%     | $8,001 – $15,000  | 2, 4, 6, 8       | 8q: +1.5%  |
 * | Platino | 4,000+      | 5.0%     | $15,001 – $25,000 | 2, 4, 6, 8, 12   | >6q: +1.5% |
 */

const LEVEL_ORDER = ['Bronce', 'Plata', 'Oro', 'Platino'];

const LEVEL_THRESHOLDS = {
  Bronce: 0,
  Plata: 500,
  Oro: 1500,
  Platino: 4000,
};

const LEVEL_CASHBACK_RATES = {
  Bronce: 0.005,
  Plata: 0.015,
  Oro: 0.025,
  Platino: 0.05,
};

const LEVEL_CREDIT_LIMITS = {
  Bronce: { min: 500, max: 2500 },
  Plata: { min: 2501, max: 8000 },
  Oro: { min: 8001, max: 15000 },
  Platino: { min: 15001, max: 25000 },
};

const LEVEL_MAX_INSTALLMENTS = {
  Bronce: 4,
  Plata: 6,
  Oro: 8,
  Platino: 12,
};

// Comisión para planes extendidos (más de 6 quincenas).
const COMMISSION_RATE_EXTENDED = 0.015;

// Puntos otorgados por acción (para PUT /api/user/score).
const ACTION_POINTS = {
  welcome: 200,
  purchase: 50,
  'on-time-payment': 25,
  'purchase-complete': 100,
  'thirty-day-streak': 150,
  referral: 300,
};

// Logros por defecto del Score Coach.
const DEFAULT_ACHIEVEMENTS = [
  { id: 'on-time-payment', title: 'Realiza tu siguiente pago a tiempo', completed: false, points: 25 },
  { id: 'three-purchases', title: 'Usa Kueski Pay 3 veces', completed: false, points: 150 },
  { id: 'thirty-days', title: 'Mantén buen historial 30 días', completed: false, points: 150 },
  { id: 'referral', title: 'Invita a un amigo y gana puntos', completed: false, points: 300 },
];

/** Devuelve el nivel correspondiente a una cantidad de puntos. */
function computeLevel(points) {
  let level = 'Bronce';
  for (const name of LEVEL_ORDER) {
    if (points >= LEVEL_THRESHOLDS[name]) level = name;
  }
  return level;
}

/** Beneficios asociados a un nivel: cashback, crédito y máximo de quincenas. */
function levelBenefits(level) {
  return {
    level,
    cashbackRate: LEVEL_CASHBACK_RATES[level],
    creditLimit: LEVEL_CREDIT_LIMITS[level],
    maxInstallments: LEVEL_MAX_INSTALLMENTS[level],
  };
}

/** Siguiente nivel y puntos que faltan para alcanzarlo (null si es Platino). */
function nextLevelInfo(points) {
  const level = computeLevel(points);
  const idx = LEVEL_ORDER.indexOf(level);
  const nextLevel = LEVEL_ORDER[idx + 1] ?? null;
  const pointsToNextLevel = nextLevel ? LEVEL_THRESHOLDS[nextLevel] - points : null;
  return { nextLevel, pointsToNextLevel };
}

/** Redondea hacia arriba a 2 decimales (evita cobrar de menos por truncamiento). */
function round2(n) {
  return Math.ceil(n * 100) / 100;
}

/**
 * Calcula los planes de quincenas disponibles para un usuario, según su nivel
 * y crédito disponible.
 *
 * @param {number} cartTotal            Monto del carrito en MXN.
 * @param {string} level                Nivel del usuario.
 * @param {number} availableCredit      Crédito disponible del usuario en MXN.
 * @param {number} [maxInstallmentsOverride]  Para unlock_installments (deal).
 * @returns {{ approved: boolean, availableCredit: number, plans: object[] }}
 */
function calculatePlans(cartTotal, level, availableCredit, maxInstallmentsOverride) {
  const maxInstallments = maxInstallmentsOverride ?? LEVEL_MAX_INSTALLMENTS[level];
  const approved = cartTotal > 0 && cartTotal <= availableCredit;

  const plans = [2, 4, 6, 8, 12]
    .filter((periods) => periods <= maxInstallments)
    .map((periods) => {
      const isExtended = periods > 6;
      const commissionRate = isExtended ? COMMISSION_RATE_EXTENDED : 0;
      const totalAmount = cartTotal * (1 + commissionRate);
      return {
        periods,
        paymentPerPeriod: round2(totalAmount / periods),
        totalAmount: round2(totalAmount),
        commissionRate,
        commissionAmount: round2(cartTotal * commissionRate),
        requiresLevel: periods > 6 ? 'Oro' : periods > 4 ? 'Plata' : null,
      };
    });

  return { approved, availableCredit, plans };
}

/**
 * Aplica el beneficio de un deal al cálculo de planes y cashback.
 *
 * Tipos soportados:
 *   no_interest          → comisión 0 en todos los planes
 *   cashback_bonus       → cashback += cartTotal * discount_value
 *   free_shipping        → effectiveTotal = cartTotal - discount_value (mínimo $50)
 *   unlock_installments  → amplía maxInstallments hasta discount_value
 *
 * @param {{ discount_type: string, discount_value: number, title: string, id: number }} deal
 * @param {number} cartTotal
 * @param {string} level
 * @param {number} availableCredit
 * @returns {{ effectiveTotal: number, plans: object[], cashback: number, appliedDeal: object|null }}
 */
function applyDeal(deal, cartTotal, level, availableCredit) {
  let effectiveTotal = cartTotal;
  let maxInstallmentsOverride;

  if (deal.discount_type === 'free_shipping') {
    effectiveTotal = Math.max(MIN_PURCHASE, cartTotal - deal.discount_value);
  } else if (deal.discount_type === 'unlock_installments') {
    maxInstallmentsOverride = Math.max(LEVEL_MAX_INSTALLMENTS[level], deal.discount_value);
  }

  let { plans } = calculatePlans(effectiveTotal, level, availableCredit, maxInstallmentsOverride);

  if (deal.discount_type === 'no_interest') {
    plans = plans.map((p) => ({
      ...p,
      commissionRate: 0,
      commissionAmount: 0,
      totalAmount: round2(effectiveTotal),
      paymentPerPeriod: round2(effectiveTotal / p.periods),
    }));
  }

  let cashback = calculateCashback(effectiveTotal, level);
  if (deal.discount_type === 'cashback_bonus') {
    cashback = round2(cashback + effectiveTotal * deal.discount_value);
  }

  return {
    effectiveTotal,
    plans,
    cashback,
    appliedDeal: { id: deal.id, title: deal.title, discountType: deal.discount_type, discountValue: deal.discount_value },
  };
}

/** Cashback en MXN para un monto y nivel dados. */
function calculateCashback(amount, level) {
  const rate = LEVEL_CASHBACK_RATES[level] ?? 0;
  return Math.round(amount * rate * 100) / 100;
}

// ─── Motor de elegibilidad (aprobación por múltiples factores) ────────────────

const MIN_PURCHASE = 50;            // monto mínimo financiable
const MAX_ACTIVE_PURCHASES = 5;     // compras activas simultáneas permitidas

/**
 * Evalúa si un usuario puede financiar una compra, considerando su historial
 * y su crédito. Devuelve { approved, reason, message }. `reason` es null si
 * la compra es elegible, o un código de rechazo en caso contrario.
 *
 * @param {object} user       Usuario con `availableCredit`.
 * @param {number} cartTotal  Monto de la compra en MXN.
 * @param {object[]} purchases Compras del usuario (para revisar mora y límite).
 */
function evaluateEligibility(user, cartTotal, purchases = []) {
  if (typeof cartTotal !== 'number' || cartTotal < MIN_PURCHASE) {
    return { approved: false, reason: 'MONTO_INVALIDO', message: `El monto mínimo para diferir es $${MIN_PURCHASE}.` };
  }
  if (purchases.some((p) => p.status === 'vencido')) {
    return { approved: false, reason: 'MORA', message: 'Tienes un pago vencido. Regulariza tu cuenta para usar Kueski Pay.' };
  }
  const activos = purchases.filter((p) => p.status === 'activo').length;
  if (activos >= MAX_ACTIVE_PURCHASES) {
    return { approved: false, reason: 'LIMITE_COMPRAS_ACTIVAS', message: 'Alcanzaste el máximo de compras activas simultáneas.' };
  }
  if (cartTotal > user.availableCredit) {
    return { approved: false, reason: 'CREDITO_INSUFICIENTE', message: `El monto supera tu crédito disponible ($${user.availableCredit}).` };
  }
  return { approved: true, reason: null, message: null };
}

/**
 * Genera el calendario de pagos pendientes derivado de las compras activas.
 * Cada quincena = 15 días desde la fecha de compra.
 *
 * @param {object[]} purchases Compras del usuario (deben tener date, plan, payment_per_period,
 *                             installments_paid, status, id, site).
 * @param {Date} [now=new Date()]
 * @returns {object[]} Installments pendientes, ordenados por dueDate ASC.
 */
function buildPaymentSchedule(purchases, now = new Date()) {
  const pending = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (const p of purchases) {
    if (p.status !== 'activo') continue;
    const paid = p.installments_paid ?? 0;
    if (paid >= p.plan) continue;
    const base = new Date(p.date);
    for (let i = paid + 1; i <= p.plan; i++) {
      const due = new Date(base);
      due.setDate(due.getDate() + 15 * i);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due - today) / 86_400_000);
      pending.push({
        purchaseId: p.id,
        site: p.site,
        amount: p.payment_per_period,
        dueDate: due.toISOString(),
        installmentNumber: i,
        totalInstallments: p.plan,
        remaining: p.plan - paid,
        overdue: diffDays < 0,
        daysUntilDue: diffDays,
      });
      break; // Solo el próximo pago de cada compra
    }
  }

  pending.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  return pending;
}

/** Devuelve el próximo pago único (el más urgente) entre todas las compras activas. */
function nextPaymentFrom(purchases, now = new Date()) {
  const schedule = buildPaymentSchedule(purchases, now);
  if (!schedule.length) return null;
  const next = schedule[0];
  return { date: next.dueDate, amount: next.amount };
}

module.exports = {
  LEVEL_ORDER,
  LEVEL_THRESHOLDS,
  LEVEL_CASHBACK_RATES,
  LEVEL_CREDIT_LIMITS,
  LEVEL_MAX_INSTALLMENTS,
  ACTION_POINTS,
  DEFAULT_ACHIEVEMENTS,
  MIN_PURCHASE,
  MAX_ACTIVE_PURCHASES,
  computeLevel,
  levelBenefits,
  nextLevelInfo,
  calculatePlans,
  calculateCashback,
  evaluateEligibility,
  applyDeal,
  buildPaymentSchedule,
  nextPaymentFrom,
};
