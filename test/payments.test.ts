import { describe, it, expect } from 'vitest';
import {
  calculateInstallmentPlans,
  calculateCashback,
  formatMXN,
} from '../src/utils/payments';

describe('calculateInstallmentPlans', () => {
  it('genera 2 planes (2 y 4 quincenas) para nivel Bronce', () => {
    const plans = calculateInstallmentPlans(1000, 'Bronce');
    const periods = plans.map((p) => p.periods);
    expect(periods).toContain(2);
    expect(periods).toContain(4);
    expect(periods).not.toContain(6);
    expect(periods).not.toContain(8);
  });

  it('genera hasta 6 quincenas para nivel Plata', () => {
    const plans = calculateInstallmentPlans(1000, 'Plata');
    const periods = plans.map((p) => p.periods);
    expect(periods).toContain(6);
    expect(periods).not.toContain(8);
  });

  it('genera hasta 8 quincenas (con comisión) para nivel Oro', () => {
    const plans = calculateInstallmentPlans(1000, 'Oro');
    const periods = plans.map((p) => p.periods);
    expect(periods).toContain(8);
    const plan8 = plans.find((p) => p.periods === 8)!;
    expect(plan8.commissionRate).toBe(0.015);
    expect(plan8.totalAmount).toBeGreaterThan(1000);
  });

  it('calcula correctamente el pago por quincena sin intereses', () => {
    const plans = calculateInstallmentPlans(2000, 'Bronce');
    const plan2 = plans.find((p) => p.periods === 2)!;
    expect(plan2.paymentPerPeriod).toBe(1000);
    expect(plan2.commissionRate).toBe(0);
    expect(plan2.totalAmount).toBe(2000);
  });

  it('aplica la comisión correctamente en planes extendidos', () => {
    const plans = calculateInstallmentPlans(10000, 'Oro');
    const plan8 = plans.find((p) => p.periods === 8)!;
    expect(plan8.totalAmount).toBeCloseTo(10150, 0); // 10000 * 1.015
    expect(plan8.commissionAmount).toBeCloseTo(150, 0);
  });

  it('no genera planes de más quincenas de las que el nivel permite', () => {
    const broncePlans = calculateInstallmentPlans(5000, 'Bronce');
    expect(broncePlans.every((p) => p.periods <= 4)).toBe(true);
  });

  it('retorna lista vacía si el monto es 0', () => {
    const plans = calculateInstallmentPlans(0, 'Bronce');
    plans.forEach((p) => {
      expect(p.paymentPerPeriod).toBe(0);
    });
  });
});

describe('calculateCashback', () => {
  it('Bronce 0.5% sobre $1000 = $5.00', () => {
    expect(calculateCashback(1000, 'Bronce')).toBe(5);
  });

  it('Plata 1.5% sobre $2000 = $30.00', () => {
    expect(calculateCashback(2000, 'Plata')).toBe(30);
  });

  it('Oro 2.5% sobre $4000 = $100.00', () => {
    expect(calculateCashback(4000, 'Oro')).toBe(100);
  });

  it('Platino 5% sobre $10000 = $500.00', () => {
    expect(calculateCashback(10000, 'Platino')).toBe(500);
  });

  it('redondea a 2 decimales', () => {
    const result = calculateCashback(333, 'Bronce'); // 333 * 0.005 = 1.665
    expect(result).toBe(1.67);
  });
});

describe('formatMXN', () => {
  it('formatea 1299 con separador de miles y 2 decimales', () => {
    expect(formatMXN(1299)).toContain('1,299');
    expect(formatMXN(1299)).toContain('.00');
  });

  it('formatea 0 como $0.00', () => {
    expect(formatMXN(0)).toContain('0.00');
  });

  it('incluye siempre 2 decimales', () => {
    expect(formatMXN(500)).toContain('.00');
  });

  it('formatea números grandes correctamente', () => {
    expect(formatMXN(25000)).toContain('25,000');
  });
});
