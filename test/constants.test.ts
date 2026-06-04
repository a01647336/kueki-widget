import { describe, it, expect } from 'vitest';
import {
  LEVEL_THRESHOLDS,
  LEVEL_CASHBACK_RATES,
  LEVEL_CREDIT_LIMITS,
  LEVEL_MAX_INSTALLMENTS,
  LEVEL_ORDER,
  POINTS,
  COMPATIBLE_SITES,
} from '../src/constants/kueski';

describe('LEVEL_THRESHOLDS', () => {
  it('Bronce inicia en 0 puntos', () => {
    expect(LEVEL_THRESHOLDS.Bronce).toBe(0);
  });

  it('los umbrales están en orden ascendente', () => {
    expect(LEVEL_THRESHOLDS.Plata).toBeGreaterThan(LEVEL_THRESHOLDS.Bronce);
    expect(LEVEL_THRESHOLDS.Oro).toBeGreaterThan(LEVEL_THRESHOLDS.Plata);
    expect(LEVEL_THRESHOLDS.Platino).toBeGreaterThan(LEVEL_THRESHOLDS.Oro);
  });

  it('todos los niveles tienen umbral definido', () => {
    expect(LEVEL_THRESHOLDS.Plata).toBe(500);
    expect(LEVEL_THRESHOLDS.Oro).toBe(1500);
    expect(LEVEL_THRESHOLDS.Platino).toBe(4000);
  });
});

describe('LEVEL_CASHBACK_RATES', () => {
  it('los rates están en orden ascendente por nivel', () => {
    expect(LEVEL_CASHBACK_RATES.Plata).toBeGreaterThan(LEVEL_CASHBACK_RATES.Bronce);
    expect(LEVEL_CASHBACK_RATES.Oro).toBeGreaterThan(LEVEL_CASHBACK_RATES.Plata);
    expect(LEVEL_CASHBACK_RATES.Platino).toBeGreaterThan(LEVEL_CASHBACK_RATES.Oro);
  });

  it('Platino tiene 5% de cashback', () => {
    expect(LEVEL_CASHBACK_RATES.Platino).toBe(0.05);
  });

  it('Bronce tiene 0.5% de cashback', () => {
    expect(LEVEL_CASHBACK_RATES.Bronce).toBe(0.005);
  });
});

describe('LEVEL_CREDIT_LIMITS', () => {
  it('el límite máximo de Platino es $25,000 MXN', () => {
    expect(LEVEL_CREDIT_LIMITS.Platino.max).toBe(25000);
  });

  it('el límite mínimo de Bronce es $500 MXN', () => {
    expect(LEVEL_CREDIT_LIMITS.Bronce.min).toBe(500);
  });

  it('no hay saltos en los rangos entre niveles', () => {
    expect(LEVEL_CREDIT_LIMITS.Plata.min).toBe(LEVEL_CREDIT_LIMITS.Bronce.max + 1);
    expect(LEVEL_CREDIT_LIMITS.Oro.min).toBe(LEVEL_CREDIT_LIMITS.Plata.max + 1);
    expect(LEVEL_CREDIT_LIMITS.Platino.min).toBe(LEVEL_CREDIT_LIMITS.Oro.max + 1);
  });
});

describe('LEVEL_MAX_INSTALLMENTS', () => {
  it('Bronce máximo 4 quincenas', () => {
    expect(LEVEL_MAX_INSTALLMENTS.Bronce).toBe(4);
  });

  it('Platino máximo 12 quincenas', () => {
    expect(LEVEL_MAX_INSTALLMENTS.Platino).toBe(12);
  });

  it('los planes disponibles aumentan con el nivel', () => {
    expect(LEVEL_MAX_INSTALLMENTS.Plata).toBeGreaterThan(LEVEL_MAX_INSTALLMENTS.Bronce);
    expect(LEVEL_MAX_INSTALLMENTS.Oro).toBeGreaterThan(LEVEL_MAX_INSTALLMENTS.Plata);
    expect(LEVEL_MAX_INSTALLMENTS.Platino).toBeGreaterThan(LEVEL_MAX_INSTALLMENTS.Oro);
  });
});

describe('POINTS', () => {
  it('todos los valores son positivos', () => {
    Object.values(POINTS).forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it('bienvenida otorga más puntos que una compra simple', () => {
    expect(POINTS.WELCOME).toBeGreaterThan(POINTS.PURCHASE);
  });

  it('referido otorga los puntos más altos', () => {
    const max = Math.max(...Object.values(POINTS));
    expect(POINTS.REFERRAL).toBe(max);
  });
});

describe('COMPATIBLE_SITES', () => {
  it('incluye Amazon', () => {
    expect(COMPATIBLE_SITES).toContain('amazon');
  });

  it('incluye Liverpool', () => {
    expect(COMPATIBLE_SITES).toContain('liverpool');
  });

  it('tiene al menos 3 sitios', () => {
    expect(COMPATIBLE_SITES.length).toBeGreaterThanOrEqual(3);
  });
});

describe('LEVEL_ORDER', () => {
  it('el orden es Bronce → Plata → Oro → Platino', () => {
    expect(LEVEL_ORDER).toEqual(['Bronce', 'Plata', 'Oro', 'Platino']);
  });
});
