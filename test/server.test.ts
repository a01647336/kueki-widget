/**
 * server.test.ts — Pruebas de integración del backend (Express + supertest).
 *
 * Usa un archivo de DB temporal (DB_FILE) para no tocar el kueski_db.json real,
 * y lo re-siembra antes de cada test para aislar el estado.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';

const TMP_DB = path.join(os.tmpdir(), `kueski_test_${process.pid}.json`);
process.env.DB_FILE = TMP_DB;
process.env.NODE_ENV = 'test';

const require = createRequire(import.meta.url);
const { app, INITIAL_DB } = require('../server/server.js');

function reseed() {
  fs.writeFileSync(TMP_DB, JSON.stringify(INITIAL_DB, null, 2));
}

/** Hace login y devuelve un access token válido. */
async function login(): Promise<string> {
  const otp = await request(app).post('/api/auth/send-otp').send({ identifier: 'carlos@ejemplo.com' });
  const res = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: 'carlos@ejemplo.com', code: otp.body.devCode });
  return res.body.accessToken;
}

beforeEach(() => reseed());
afterAll(() => { try { fs.unlinkSync(TMP_DB); } catch { /* ignore */ } });

describe('Health', () => {
  it('GET /api/health responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Autenticación', () => {
  it('send-otp devuelve devCode en modo demo', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({ identifier: 'carlos@ejemplo.com' });
    expect(res.status).toBe(200);
    expect(res.body.devCode).toMatch(/^\d{6}$/);
  });

  it('send-otp rechaza identificador inválido (400)', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({ identifier: 'no-valido' });
    expect(res.status).toBe(400);
  });

  it('verify-otp emite tokens y perfil', async () => {
    const otp = await request(app).post('/api/auth/send-otp').send({ identifier: 'carlos@ejemplo.com' });
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ identifier: 'carlos@ejemplo.com', code: otp.body.devCode });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.name).toBe('Carlos Mendoza');
  });

  it('verify-otp rechaza código que no tiene 6 dígitos (400)', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ identifier: 'carlos@ejemplo.com', code: '12' });
    expect(res.status).toBe(400);
  });

  it('refresh-token renueva el access token', async () => {
    const otp = await request(app).post('/api/auth/send-otp').send({ identifier: 'carlos@ejemplo.com' });
    const login = await request(app)
      .post('/api/auth/verify-otp')
      .send({ identifier: 'carlos@ejemplo.com', code: otp.body.devCode });
    const res = await request(app).post('/api/auth/refresh-token').send({ refreshToken: login.body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('refresh-token rechaza un token inválido (401)', async () => {
    const res = await request(app).post('/api/auth/refresh-token').send({ refreshToken: 'basura' });
    expect(res.status).toBe(401);
  });
});

describe('Usuario y autorización', () => {
  it('GET /api/user sin token devuelve 401', async () => {
    const res = await request(app).get('/api/user');
    expect(res.status).toBe(401);
  });

  it('GET /api/user con token devuelve el perfil', async () => {
    const token = await login();
    const res = await request(app).get('/api/user').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.level).toBe('Bronce');
    expect(res.body.creditLimit).toBe(2500);
  });

  it('preferencias: GET y PUT (merge parcial)', async () => {
    const token = await login();
    await request(app)
      .put('/api/user/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ disabledSites: ['coppel'] });
    const res = await request(app).get('/api/user/preferences').set('Authorization', `Bearer ${token}`);
    expect(res.body.disabledSites).toEqual(['coppel']);
    expect(res.body.notifications.reminders).toBe(true);
  });
});

describe('Score y gamificación', () => {
  it('PUT /api/user/score sube de nivel y marca levelChanged', async () => {
    const token = await login();
    const res = await request(app)
      .put('/api/user/score')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 1600 });
    expect(res.body.level).toBe('Oro');
    expect(res.body.levelChanged).toBe(true);
  });

  it('GET /api/user/score reporta el siguiente nivel', async () => {
    const token = await login();
    const res = await request(app).get('/api/user/score').set('Authorization', `Bearer ${token}`);
    expect(res.body.level).toBe('Bronce');
    expect(res.body.nextLevel).toBe('Plata');
    expect(res.body.pointsToNextLevel).toBe(250); // 500 - 250
  });

  it('completar un logro otorga puntos y es idempotente (409)', async () => {
    const token = await login();
    const first = await request(app)
      .post('/api/user/achievements/referral/complete')
      .set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(200);
    expect(first.body.pointsAwarded).toBe(300);

    const second = await request(app)
      .post('/api/user/achievements/referral/complete')
      .set('Authorization', `Bearer ${token}`);
    expect(second.status).toBe(409);
  });
});

describe('Planes personalizados por nivel', () => {
  it('Bronce solo recibe planes de 2 y 4 quincenas', async () => {
    const token = await login();
    const res = await request(app)
      .post('/api/purchases/calculate-plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ cartTotal: 1500 });
    expect(res.body.approved).toBe(true);
    expect(res.body.plans.map((p: { periods: number }) => p.periods)).toEqual([2, 4]);
  });

  it('Oro recibe hasta 8 quincenas con comisión en la de 8', async () => {
    const token = await login();
    await request(app).put('/api/user/score').set('Authorization', `Bearer ${token}`).send({ points: 1600 });
    const res = await request(app)
      .post('/api/purchases/calculate-plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ cartTotal: 5000 });
    const periods = res.body.plans.map((p: { periods: number }) => p.periods);
    expect(periods).toEqual([2, 4, 6, 8]);
    const plan8 = res.body.plans.find((p: { periods: number }) => p.periods === 8);
    expect(plan8.commissionRate).toBe(0.015);
  });

  it('no aprueba si el monto supera el crédito disponible', async () => {
    const token = await login();
    const res = await request(app)
      .post('/api/purchases/calculate-plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ cartTotal: 999999 });
    expect(res.body.approved).toBe(false);
  });
});

describe('Compras', () => {
  it('registra una compra, baja el crédito y aparece en el historial', async () => {
    const token = await login();
    const before = await request(app).get('/api/user').set('Authorization', `Bearer ${token}`);
    const creditBefore = before.body.availableCredit;

    const create = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'p_test_1', site: 'amazon', amount: 1000, plan: 4 });
    expect(create.status).toBe(201);

    const after = await request(app).get('/api/user').set('Authorization', `Bearer ${token}`);
    expect(after.body.availableCredit).toBe(creditBefore - 1000);

    const list = await request(app).get('/api/purchases').set('Authorization', `Bearer ${token}`);
    expect(list.body.find((p: { id: string }) => p.id === 'p_test_1')).toBeTruthy();
  });

  it('rechaza compras con id duplicado (409)', async () => {
    const token = await login();
    const body = { id: 'p_dup', site: 'amazon', amount: 500, plan: 2 };
    await request(app).post('/api/purchases').set('Authorization', `Bearer ${token}`).send(body);
    const dup = await request(app).post('/api/purchases').set('Authorization', `Bearer ${token}`).send(body);
    expect(dup.status).toBe(409);
  });

  it('detalle (404 si no existe) y actualización de estado', async () => {
    const token = await login();
    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'p_status', site: 'liverpool', amount: 800, plan: 2 });

    const notFound = await request(app).get('/api/purchases/nope').set('Authorization', `Bearer ${token}`);
    expect(notFound.status).toBe(404);

    const updated = await request(app)
      .put('/api/purchases/p_status/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'pagado' });
    expect(updated.body.status).toBe('pagado');
  });
});

describe('Cashback', () => {
  it('acumula el cashback de las compras registradas', async () => {
    const token = await login();
    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'p_cb', site: 'amazon', amount: 2000, plan: 2, cashback: 10 });
    const res = await request(app).get('/api/user/cashback').set('Authorization', `Bearer ${token}`);
    expect(res.body.totalEarned).toBeGreaterThanOrEqual(10);
    expect(res.body.history.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Deals', () => {
  it('lista deals y marca el activo del sitio', async () => {
    const token = await login();
    const res = await request(app).get('/api/deals?site=amazon').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const amazon = res.body.find((d: { site: string }) => d.site === 'amazon');
    expect(amazon.isActive).toBe(true);
  });

  it('suscribirse a un deal inexistente devuelve 404', async () => {
    const token = await login();
    const res = await request(app).post('/api/deals/999/subscribe').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
