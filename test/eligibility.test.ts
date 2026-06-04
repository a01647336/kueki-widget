/**
 * eligibility.test.ts — Escenarios de RECHAZO de compra.
 *
 * Prueba el motor `evaluateEligibility` (unitario) y los endpoints
 * `calculate-plans` / `POST /purchases` (integración con pg-mem).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import request from 'supertest';
import { newDb } from 'pg-mem';

const require = createRequire(import.meta.url);
const rules            = require('../server/lib/rules');
const { app, setPool } = require('../server/server.js');
const { initSchema }   = require('../server/lib/db');
const { seedDatabase } = require('../server/lib/seed');

let pool: any;

beforeAll(async () => {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  pool = new (Pool as any)();
  await initSchema(pool);
  setPool(pool);
}, 30000);

afterAll(async () => { await pool?.end?.(); });

beforeEach(async () => {
  await pool.query('DELETE FROM purchases');
  await pool.query('DELETE FROM users');
  await pool.query('DELETE FROM deals');
  await seedDatabase(pool);
});

async function loginAs(username: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ username, password: 'kueski123' });
  return res.body.accessToken;
}

// ─── Unitario: evaluateEligibility ────────────────────────────────────────────

describe('evaluateEligibility (unitario)', () => {
  const user = { availableCredit: 5000 };

  it('aprueba una compra dentro del crédito y al corriente', () => {
    const r = rules.evaluateEligibility(user, 1000, []);
    expect(r.approved).toBe(true);
    expect(r.reason).toBeNull();
  });

  it('rechaza por MONTO_INVALIDO si es menor al mínimo', () => {
    const r = rules.evaluateEligibility(user, 30, []);
    expect(r.reason).toBe('MONTO_INVALIDO');
  });

  it('rechaza por MORA si hay una compra vencida', () => {
    const r = rules.evaluateEligibility(user, 1000, [{ status: 'vencido' }]);
    expect(r.reason).toBe('MORA');
  });

  it('rechaza por LIMITE_COMPRAS_ACTIVAS con 5 compras activas', () => {
    const activas = Array.from({ length: 5 }, () => ({ status: 'activo' }));
    const r = rules.evaluateEligibility(user, 1000, activas);
    expect(r.reason).toBe('LIMITE_COMPRAS_ACTIVAS');
  });

  it('rechaza por CREDITO_INSUFICIENTE si el monto supera el crédito', () => {
    const r = rules.evaluateEligibility(user, 9000, []);
    expect(r.reason).toBe('CREDITO_INSUFICIENTE');
  });

  it('la mora tiene prioridad sobre el crédito insuficiente', () => {
    const r = rules.evaluateEligibility(user, 9000, [{ status: 'vencido' }]);
    expect(r.reason).toBe('MORA');
  });
});

// ─── Integración: endpoints rechazan correctamente ───────────────────────────

describe('calculate-plans / purchases — rechazos vía API', () => {
  it('pedro (con pago vencido) recibe approved:false y reason MORA', async () => {
    const token = await loginAs('pedro');
    const res = await request(app).post('/api/purchases/calculate-plans')
      .set('Authorization', `Bearer ${token}`).send({ cartTotal: 1000 });
    expect(res.body.approved).toBe(false);
    expect(res.body.reason).toBe('MORA');
    expect(res.body.message).toMatch(/vencido/i);
  });

  it('POST /purchases con mora devuelve 422 y NO baja el crédito', async () => {
    const token  = await loginAs('pedro');
    const before = await request(app).get('/api/user').set('Authorization', `Bearer ${token}`);
    const res    = await request(app).post('/api/purchases').set('Authorization', `Bearer ${token}`)
      .send({ id: 'p_pedro_x', site: 'amazon', amount: 1000, plan: 4 });
    expect(res.status).toBe(422);
    const after = await request(app).get('/api/user').set('Authorization', `Bearer ${token}`);
    expect(after.body.availableCredit).toBe(before.body.availableCredit);
  });

  it('crédito insuficiente: monto mayor al disponible devuelve 422', async () => {
    const token = await loginAs('carlos'); // crédito disponible ~1950
    const res   = await request(app).post('/api/purchases').set('Authorization', `Bearer ${token}`)
      .send({ id: 'p_carlos_big', site: 'amazon', amount: 5000, plan: 4 });
    expect(res.status).toBe(422);
    expect(res.body.reason).toBe('CREDITO_INSUFICIENTE');
  });

  it('límite de compras activas: la 6ª compra se rechaza', async () => {
    // diego ya tiene 2 compras activas del seed (seed_diego_1, seed_diego_2).
    // Agregamos 3 más para llegar al máximo de 5 activas, y la siguiente es rechazada.
    const token = await loginAs('diego');
    for (let i = 0; i < 3; i++) {
      const ok = await request(app).post('/api/purchases').set('Authorization', `Bearer ${token}`)
        .send({ id: `p_diego_${i}`, site: 'amazon', amount: 200, plan: 2 });
      expect(ok.status).toBe(201);
    }
    const rejected = await request(app).post('/api/purchases').set('Authorization', `Bearer ${token}`)
      .send({ id: 'p_diego_extra', site: 'amazon', amount: 200, plan: 2 });
    expect(rejected.status).toBe(422);
    expect(rejected.body.reason).toBe('LIMITE_COMPRAS_ACTIVAS');
  });

  it('monto inválido (menor a $50) devuelve 422', async () => {
    const token = await loginAs('ana');
    const res   = await request(app).post('/api/purchases').set('Authorization', `Bearer ${token}`)
      .send({ id: 'p_ana_small', site: 'amazon', amount: 30, plan: 2 });
    expect(res.status).toBe(422);
    expect(res.body.reason).toBe('MONTO_INVALIDO');
  });
});
