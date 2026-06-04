import type { LevelName } from '../types';
import { LEVEL_MAX_INSTALLMENTS, LEVEL_CASHBACK_RATES } from '../constants/kueski';

export interface InstallmentPlan {
  periods: number;
  paymentPerPeriod: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  requiresLevel: LevelName | null;
}

const COMMISSION_RATE_EXTENDED = 0.015; // 1.5% para planes extendidos (Oro/Platino)

export function calculateInstallmentPlans(
  cartTotal: number,
  userLevel: LevelName
): InstallmentPlan[] {
  const maxInstallments = LEVEL_MAX_INSTALLMENTS[userLevel];

  const basePlans = [2, 4, 6, 8, 12];

  return basePlans
    .filter((p) => p <= maxInstallments || p <= 6)
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
    })
    .filter((plan) => {
      if (!plan.requiresLevel) return true;
      const levelOrder: LevelName[] = ['Bronce', 'Plata', 'Oro', 'Platino'];
      return levelOrder.indexOf(userLevel) >= levelOrder.indexOf(plan.requiresLevel);
    });
}

export function calculateCashback(amount: number, level: LevelName): number {
  const rate = LEVEL_CASHBACK_RATES[level];
  return Math.round(amount * rate * 100) / 100;
}

export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
