import type { LevelName, Purchase, UpcomingPayment } from '../types';
import { LEVEL_MAX_INSTALLMENTS, LEVEL_CASHBACK_RATES } from '../constants/kueski';
import type { AppliedDeal } from './api';

export interface InstallmentPlan {
  periods: number;
  paymentPerPeriod: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  requiresLevel: LevelName | null;
}

const COMMISSION_RATE_EXTENDED = 0.015; // 1.5% para planes extendidos (Oro/Platino)

/**
 * Calcula los planes de quincenas disponibles para un nivel.
 * Es el fallback offline del endpoint `POST /api/purchases/calculate-plans`
 * y comparte exactamente las reglas de `server/lib/rules.js`: el máximo de
 * quincenas lo determina el nivel del usuario.
 */
export function calculateInstallmentPlans(
  cartTotal: number,
  userLevel: LevelName
): InstallmentPlan[] {
  const maxInstallments = LEVEL_MAX_INSTALLMENTS[userLevel];

  return [2, 4, 6, 8, 12]
    .filter((periods) => periods <= maxInstallments)
    .map((periods) => {
      const isExtended = periods > 6;
      const commissionRate = isExtended ? COMMISSION_RATE_EXTENDED : 0;
      const totalAmount = cartTotal * (1 + commissionRate);
      const paymentPerPeriod = totalAmount / periods;
      const requiresLevel: LevelName | null =
        periods > 6 ? 'Oro' : periods > 4 ? 'Plata' : null;

      return {
        periods,
        paymentPerPeriod: Math.ceil(paymentPerPeriod * 100) / 100,
        totalAmount: Math.ceil(totalAmount * 100) / 100,
        commissionRate,
        commissionAmount: Math.ceil(cartTotal * commissionRate * 100) / 100,
        requiresLevel,
      };
    });
}

export function calculateCashback(amount: number, level: LevelName): number {
  const rate = LEVEL_CASHBACK_RATES[level];
  return Math.round(amount * rate * 100) / 100;
}

const MIN_PURCHASE = 50;
const COMMISSION_RATE = 0.015;

/**
 * Aplica un deal al cálculo de planes y cashback (paridad con server/lib/rules.js#applyDeal).
 * Usado como fallback offline en PaymentSimulator.
 */
export function applyDealOffline(
  deal: AppliedDeal,
  cartTotal: number,
  userLevel: LevelName
): { effectiveTotal: number; plans: InstallmentPlan[]; cashback: number } {
  let effectiveTotal = cartTotal;
  let maxInstallmentsOverride: number | undefined;

  if (deal.discountType === 'free_shipping') {
    effectiveTotal = Math.max(MIN_PURCHASE, cartTotal - deal.discountValue);
  } else if (deal.discountType === 'unlock_installments') {
    maxInstallmentsOverride = Math.max(LEVEL_MAX_INSTALLMENTS[userLevel], deal.discountValue);
  }

  let plans = calculateInstallmentPlansRaw(effectiveTotal, userLevel, maxInstallmentsOverride);

  if (deal.discountType === 'no_interest') {
    plans = plans.map((p) => ({
      ...p,
      commissionRate: 0,
      commissionAmount: 0,
      totalAmount: Math.ceil(effectiveTotal * 100) / 100,
      paymentPerPeriod: Math.ceil((effectiveTotal / p.periods) * 100) / 100,
    }));
  }

  let cashback = calculateCashback(effectiveTotal, userLevel);
  if (deal.discountType === 'cashback_bonus') {
    cashback = Math.round((cashback + effectiveTotal * deal.discountValue) * 100) / 100;
  }

  return { effectiveTotal, plans, cashback };
}

function calculateInstallmentPlansRaw(
  cartTotal: number,
  userLevel: LevelName,
  maxInstallmentsOverride?: number
): InstallmentPlan[] {
  const maxInstallments = maxInstallmentsOverride ?? LEVEL_MAX_INSTALLMENTS[userLevel];
  return [2, 4, 6, 8, 12]
    .filter((periods) => periods <= maxInstallments)
    .map((periods) => {
      const isExtended = periods > 6;
      const commissionRate = isExtended ? COMMISSION_RATE : 0;
      const totalAmount = cartTotal * (1 + commissionRate);
      return {
        periods,
        paymentPerPeriod: Math.ceil((totalAmount / periods) * 100) / 100,
        totalAmount: Math.ceil(totalAmount * 100) / 100,
        commissionRate,
        commissionAmount: Math.ceil(cartTotal * commissionRate * 100) / 100,
        requiresLevel: (periods > 6 ? 'Oro' : periods > 4 ? 'Plata' : null) as LevelName | null,
      };
    });
}

/**
 * Genera el calendario de próximos pagos pendientes desde las compras locales.
 * Espejo offline de server/lib/rules.js#buildPaymentSchedule.
 */
export function buildPaymentSchedule(purchases: Purchase[], now: Date = new Date()): UpcomingPayment[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const pending: UpcomingPayment[] = [];

  for (const p of purchases) {
    if (p.status !== 'activo') continue;
    const paid = p.installmentsPaid ?? 0;
    if (paid >= p.plan) continue;
    const base = new Date(p.date);
    const nextNum = paid + 1;
    const due = new Date(base);
    due.setDate(due.getDate() + 15 * nextNum);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
    pending.push({
      purchaseId: p.id,
      site: p.site,
      amount: p.paymentPerPeriod,
      dueDate: due.toISOString(),
      installmentNumber: nextNum,
      totalInstallments: p.plan,
      remaining: p.plan - paid,
      overdue: diffDays < 0,
      daysUntilDue: diffDays,
    });
  }

  return pending.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/** Retorna el próximo pago más urgente entre las compras activas (o null). */
export function getNextPayment(purchases: Purchase[]): { date: string; amount: number } | null {
  const schedule = buildPaymentSchedule(purchases);
  if (!schedule.length) return null;
  return { date: schedule[0].dueDate, amount: schedule[0].amount };
}

export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
