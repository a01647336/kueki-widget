/**
 * server.test.ts — Integración del backend (Express + PostgreSQL) con
 * pg-mem (base de datos en memoria compatible con pg). Re-siembra antes de cada test.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import request from 'supertest';
import { newDb } from 'pg-mem';

const require = createRequire(import.meta.url);
const { app, setPool } = require('../server/server.js');
const { initSchema } = require('../server/lib/db');
const { seedDatabase } = require('../server/lib/seed');

let pool: ReturnType<ReturnType<typeof newDb>['adapters']['createPg']>['Pool'] extends new () => infer P ? P : never;

beforeAll(async () => {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  pool = new (Pool as any)();
  await initSchema(pool);
  setPool(pool);
}, 30000);

afterAll(async () => {
  await (pool as any).end?.();
});

beforeEach(async () => {
  await (pool as any).query('DELETE FROM purchases');
  await (pool as any).query('DELETE FROM users');
  await (pool as any).query('DELETE FROM deals');
  await seedDatabase(pool);
});

async function loginAs(username: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ username, password: 'kueski123' });
  return res.body.accessToken;
}

describe('Health', () => {
  it('GET /api/health responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Autenticación', () => {
  it('login válido devuelve tokens y perfil', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'ana', password: 'kueski123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.level).toBe('Plata');
  });

  it('login con contraseña incorrecta devuelve 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'ana', password: 'mala' });
    expect(res.status).toBe(401);
  });

  it('login sin campos devuelve 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'ana' });
    expect(res.status).toBe(400);
  });

  it('refresh-token renueva el access token', async () => {
    const login = await request(app).post('/api/auth/login').send({ username: 'ana', password: 'kueski123' });
    const res = await request(app).post('/api/auth/refresh-token').send({ refreshToken: login.body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });
});

describe('Usuario y autorización', () => {
  it('GET /api/user sin token devuelve 401', async () => {
    const res = await request(app).get('/api/user');
    expect(res.status).toBe(401);
  });

  it('cada usuario obtiene su propio perfil', async () => {
    const tokenAna  = await loginAs('ana');
    const tokenDiego= await loginAs('diego');
    const ana  = await request(app).get('/api/user').set('Authorization', `Bearer ${tokenAna}`);
    const diego= await request(app).get('/api/user').set('Authorization', `Bearer ${tokenDiego}`);
    expect(ana.body.level).toBe('Plata');
    expect(diego.body.level).toBe('Oro');
    expect(ana.body.id).not.toBe(diego.body.id);
  });

  it('preferencias: PUT y GET con merge parcial', async () => {
    const token = await loginAs('carlos');
    await request(app).put('/api/user/preferences').set('Authorization', `Bearer ${token}`).send({ disabledSites: ['coppel'] });
    const res = await request(app).get('/api/user/preferences').set('Authorization', `Bearer ${token}`);
    expect(res.body.disabledSites).toEqual(['coppel']);
    expect(res.body.notifications.reminders).toBe(true);
  });
});

describe('Score y gamificación', () => {
  it('PUT /api/user/score sube de nivel y marca levelChanged', async () => {
    const token = await loginAs('carlos');
    const res = await request(app).put('/api/user/score').set('Authorization', `Bearer ${token}`).send({ points: 1600 });
    expect(res.body.level).toBe('Oro');
    expect(res.body.levelChanged).toBe(true);
  });

  it('GET /api/user/score reporta el siguiente nivel', async () => {
    const token = await loginAs('carlos');
    const res = await request(app).get('/api/user/score').set('Authorization', `Bearer ${token}`);
    expect(res.body.level).toBe('Bronce');
    expect(res.body.nextLevel).toBe('Plata');
    expect(res.body.pointsToNextLevel).toBe(250);
  });

  it('completar un logro otorga puntos y es idempotente (409)', async () => {
    const token = await loginAs('carlos');
    const first  = await request(app).post('/api/user/achievements/referral/complete').set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(200);
    expect(first.body.pointsAwarded).toBe(300);
    const second = await request(app).post('/api/user/achievements/referral/complete').set('Authorization', `Bearer ${token}`);
    expect(second.status).toBe(409);
  });
});

describe('Planes personalizados por nivel', () => {
  it('Bronce (carlos) recibe planes de 2 y 4 quincenas', async () => {
    const token = await loginAs('carlos');
    const res = await request(app).post('/api/purchases/calculate-plans')
      .set('Authorization', `Bearer ${token}`).send({ cartTotal: 1500 });
    expect(res.body.approved).toBe(true);
    expect(res.body.plans.map((p: { periods: number }) => p.periods)).toEqual([2, 4]);
  });

  it('Oro (diego) recibe hasta 8 quincenas con comisión en la de 8', async () => {
    const token = await loginAs('diego');
    const res = await request(app).post('/api/purchases/calculate-plans')
      .set('Authorization', `Bearer ${token}`).send({ cartTotal: 5000 });
    expect(res.body.plans.map((p: { periods: number }) => p.periods)).toEqual([2, 4, 6, 8]);
    expect(res.body.plans.find((p: { periods: number }) => p.periods === 8).commissionRate).toBe(0.015);
  });
});

describe('Compras y aislamiento por usuario', () => {
  it('una compra de un usuario no aparece en el historial de otro', async () => {
    const tokenAna  = await loginAs('ana');
    const tokenDiego= await loginAs('diego');

    await request(app).post('/api/purchases').set('Authorization', `Bearer ${tokenAna}`)
      .send({ id: 'p_ana_1', site: 'amazon', amount: 1000, plan: 4 });

    const histAna  = await request(app).get('/api/purchases').set('Authorization', `Bearer ${tokenAna}`);
    const histDiego= await request(app).get('/api/purchases').set('Authorization', `Bearer ${tokenDiego}`);
    expect(histAna.body.find((p: { id: string }) => p.id === 'p_ana_1')).toBeTruthy();
    expect(histDiego.body.find((p: { id: string }) => p.id === 'p_ana_1')).toBeFalsy();
  });

  it('registrar una compra baja el crédito del usuario', async () => {
    const token  = await loginAs('ana');
    const before = await request(app).get('/api/user').set('Authorization', `Bearer ${token}`);
    await request(app).post('/api/purchases').set('Authorization', `Bearer ${token}`)
      .send({ id: 'p_ana_2', site: 'amazon', amount: 1000, plan: 4 });
    const after = await request(app).get('/api/user').set('Authorization', `Bearer ${token}`);
    expect(after.body.availableCredit).toBe(before.body.availableCredit - 1000);
  });
});

describe('Cashback', () => {
  it('acumula el cashback de las compras del usuario', async () => {
    const token = await loginAs('ana');
    await request(app).post('/api/purchases').set('Authorization', `Bearer ${token}`)
      .send({ id: 'p_cb', site: 'amazon', amount: 2000, plan: 2, cashback: 30 });
    const res = await request(app).get('/api/user/cashback').set('Authorization', `Bearer ${token}`);
    expect(res.body.totalEarned).toBeGreaterThanOrEqual(30);
  });
});

describe('Deals', () => {
  it('lista deals y marca el activo del sitio', async () => {
    const token = await loginAs('ana');
    const res = await request(app).get('/api/deals?site=amazon').set('Authorization', `Bearer ${token}`);
    expect(res.body.find((d: { site: string }) => d.site === 'amazon').isActive).toBe(true);
  });

  it('suscribirse a un deal inexistente devuelve 404', async () => {
    const token = await loginAs('ana');
    const res = await request(app).post('/api/deals/999/subscribe').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
