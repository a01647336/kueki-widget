/**
 * api.test.ts — Cliente HTTP del frontend (src/utils/api.ts) con fetch mockeado.
 * Verifica el manejo del token, la cabecera Authorization, el login y el
 * fallback silencioso cuando el backend no responde.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setToken,
  getToken,
  login,
  fetchUser,
  calculatePlans,
  savePurchase,
} from '../src/utils/api';

function mockJson(data: unknown, ok = true, status = 200) {
  global.fetch = vi.fn(() => Promise.resolve({ ok, status, json: () => Promise.resolve(data) } as Response));
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

describe('login', () => {
  it('guarda el access token y devuelve el perfil', async () => {
    mockJson({ accessToken: 'tok-123', refreshToken: 'ref-456', user: { name: 'Ana', level: 'Plata' } });
    const res = await login('ana', 'kueski123');
    expect(res.ok).toBe(true);
    expect(res.user?.name).toBe('Ana');
    expect(getToken()).toBe('tok-123');
  });

  it('marca invalidCredentials cuando el server responde 401', async () => {
    mockJson(null, false, 401);
    const res = await login('ana', 'mala');
    expect(res.ok).toBe(false);
    expect(res.invalidCredentials).toBe(true);
    expect(getToken()).toBeNull();
  });

  it('no marca invalidCredentials si el servidor no responde (offline)', async () => {
    mockFail();
    const res = await login('ana', 'kueski123');
    expect(res.ok).toBe(false);
    expect(res.invalidCredentials).toBe(false);
  });
});

describe('Cabecera de autorización', () => {
  it('adjunta Authorization: Bearer cuando hay token', async () => {
    setToken('mi-token');
    mockJson({ id: 'u_001', name: 'Carlos' });
    await fetchUser();
    const headers = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer mi-token');
  });

  it('no adjunta Authorization cuando no hay token', async () => {
    mockJson({ id: 'u_001' });
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
    mockJson({}, false, 500);
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
  it('devuelve los planes y la elegibilidad del backend', async () => {
    mockJson({ approved: false, reason: 'MORA', message: 'Tienes un pago vencido.', availableCredit: 5000, plans: [{ periods: 2 }] });
    const res = await calculatePlans(1500);
    expect(res?.approved).toBe(false);
    expect(res?.reason).toBe('MORA');
  });
});
