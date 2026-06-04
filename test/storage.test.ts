import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../src/utils/storage';
import type { ScoreState, Purchase } from '../src/types';

beforeEach(() => {
  localStorage.clear();
  storage._resetForTesting();
});

describe('storage.auth', () => {
  it('devuelve null si no hay datos guardados', () => {
    expect(storage.getAuth()).toBeNull();
  });

  it('guarda y recupera el estado de auth correctamente', () => {
    const authData = {
      isLoggedIn: true,
      user: {
        name: 'Carlos',
        email: 'carlos@test.com',
        level: 'Bronce' as const,
        creditLimit: 2500,
        availableCredit: 1950,
        cashbackRate: 0.005,
        nextPayment: { date: '2026-06-01', amount: 649.5 },
        score: 450,
      },
    };
    storage.setAuth(authData);
    const result = storage.getAuth();
    expect(result).toEqual(authData);
  });

  it('clearAuth elimina la sesión', () => {
    storage.setAuth({ isLoggedIn: true, user: null });
    storage.clearAuth();
    expect(storage.getAuth()).toBeNull();
  });
});

describe('storage.score', () => {
  const score: ScoreState = {
    points: 650,
    level: 'Plata',
    achievements: [
      { id: 'first-payment', title: 'Primer pago', completed: true, points: 25 },
    ],
  };

  it('devuelve null si no hay score guardado', () => {
    expect(storage.getScore()).toBeNull();
  });

  it('guarda y recupera el score correctamente', () => {
    storage.setScore(score);
    expect(storage.getScore()).toEqual(score);
  });

  it('actualiza el score al guardar uno nuevo', () => {
    storage.setScore(score);
    const updated = { ...score, points: 800, level: 'Plata' as const };
    storage.setScore(updated);
    expect(storage.getScore()?.points).toBe(800);
  });
});

describe('storage.history', () => {
  const purchase: Purchase = {
    id: 'abc-123',
    site: 'Amazon',
    amount: 2598,
    plan: 4,
    paymentPerPeriod: 649.5,
    date: '2026-05-21T10:00:00.000Z',
    cashback: 12.99,
    status: 'activo',
  };

  it('devuelve array vacío si no hay historial', () => {
    expect(storage.getHistory()).toEqual([]);
  });

  it('guarda y recupera una compra', () => {
    storage.setHistory([purchase]);
    const result = storage.getHistory();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(purchase);
  });

  it('guarda múltiples compras', () => {
    const purchases = [purchase, { ...purchase, id: 'xyz-456', amount: 5000 }];
    storage.setHistory(purchases);
    expect(storage.getHistory()).toHaveLength(2);
  });
});

describe('storage.prefs', () => {
  it('devuelve disabledSites vacío por defecto', () => {
    expect(storage.getPrefs()).toEqual({ disabledSites: [] });
  });

  it('guarda y recupera sitios desactivados', () => {
    storage.setPrefs({ disabledSites: ['amazon', 'liverpool'] });
    const result = storage.getPrefs();
    expect(result.disabledSites).toContain('amazon');
    expect(result.disabledSites).toContain('liverpool');
  });

  it('sobreescribe correctamente las prefs', () => {
    storage.setPrefs({ disabledSites: ['amazon'] });
    storage.setPrefs({ disabledSites: [] });
    expect(storage.getPrefs().disabledSites).toHaveLength(0);
  });
});
