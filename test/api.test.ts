/**
 * api.test.ts — Cliente HTTP del frontend (src/utils/api.ts) con fetch mockeado.
 * Verifica el manejo del token, la cabecera Authorization y el fallback
 * silencioso a null cuando el backend no responde.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setToken,
  getToken,
  verifyOtp,
  fetchUser,
  calculatePlans,
  savePurchase,
} from '../src/utils/api';

function mockOk(data: unknown) {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response));
}

function mockFail() {
  global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
}

beforeEach(() => {
  setToken(null);
  localStorage.clear();
});

describe('Manejo de token', () => {
  it('setToken / getToken hacen roundtrip y persisten en localStorage', () => {
    setToken('abc.def.ghi');
    expect(getToken()).toBe('abc.def.ghi');
    expect(localStorage.getItem('kueski_token')).toBe('abc.def.ghi');
  });

  it('setToken(null) limpia el token', () => {
    setToken('xyz');
    setToken(null);
    expect(getToken()).toBeNull();
    expect(localStorage.getItem('kueski_token')).toBeNull();
  });
});

describe('verifyOtp', () => {
  it('guarda el access token y devuelve el perfil', async () => {
    mockOk({ accessToken: 'tok-123', refreshToken: 'ref-456', user: { name: 'Carlos', level: 'Bronce' } });
    const user = await verifyOtp('carlos@ejemplo.com', '123456');
    expect(user?.name).toBe('Carlos');
    expect(getToken()).toBe('tok-123');
  });

  it('devuelve null si el servidor no responde (fallback offline)', async () => {
    mockFail();
    const user = await verifyOtp('carlos@ejemplo.com', '123456');
    expect(user).toBeNull();
    expect(getToken()).toBeNull();
  });
});

describe('Cabecera de autorización', () => {
  it('adjunta Authorization: Bearer cuando hay token', async () => {
    setToken('mi-token');
    mockOk({ id: 'u_001', name: 'Carlos' });
    await fetchUser();
    const headers = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer mi-token');
  });

  it('no adjunta Authorization cuando no hay token', async () => {
    mockOk({ id: 'u_001' });
    await fetchUser();
    const headers = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });
});

describe('Fallback silencioso', () => {
  it('fetchUser devuelve null si fetch falla', async () => {
    mockFail();
    expect(await fetchUser()).toBeNull();
  });

  it('fetchUser devuelve null si la respuesta no es ok', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response));
    expect(await fetchUser()).toBeNull();
  });

  it('savePurchase no lanza aunque el servidor falle', async () => {
    mockFail();
    await expect(
      savePurchase({ id: 'p1', site: 'amazon', amount: 1000, plan: 4, paymentPerPeriod: 250, cashback: 5, date: '', status: 'activo' })
    ).resolves.toBeUndefined();
  });
});

describe('calculatePlans', () => {
  it('devuelve los planes personalizados del backend', async () => {
    mockOk({ approved: true, availableCredit: 1950, plans: [{ periods: 2 }, { periods: 4 }] });
    const res = await calculatePlans(1500);
    expect(res?.approved).toBe(true);
    expect(res?.plans).toHaveLength(2);
  });
});
