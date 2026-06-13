import type { Purchase } from '../types';

export interface AchievementProgress {
  id: string;
  current: number;
  target: number;
  met: boolean;
}

/**
 * Evalúa el progreso de los logros alcanzables automáticamente
 * a partir del historial de compras.
 *
 * No evalúa 'on-time-payment' ni 'referral' — esos se disparan
 * por acción explícita del usuario.
 */
export function evaluateAchievements(purchases: Purchase[]): AchievementProgress[] {
  const nonVencido = purchases.filter((p) => p.status !== 'vencido');

  // three-purchases: 3 compras (cualquier estado salvo vencido)
  const purchaseCount = nonVencido.length;

  // thirty-days: al menos 30 días desde la compra más antigua, sin vencidos
  const hasVencido = purchases.some((p) => p.status === 'vencido');
  let oldestDays = 0;
  if (!hasVencido && nonVencido.length > 0) {
    const oldest = nonVencido.reduce((min, p) =>
      new Date(p.date) < new Date(min.date) ? p : min
    );
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const then = new Date(oldest.date);
    then.setHours(0, 0, 0, 0);
    oldestDays = Math.round((now.getTime() - then.getTime()) / 86_400_000);
  }

  return [
    { id: 'three-purchases', current: purchaseCount, target: 3, met: purchaseCount >= 3 },
    { id: 'thirty-days',     current: Math.min(oldestDays, 30), target: 30, met: oldestDays >= 30 },
  ];
}
