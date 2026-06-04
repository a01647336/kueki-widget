/**
 * api.ts — Cliente HTTP para el backend del Kueski Smart Widget
 *
 * Arquitectura híbrida (offline-first con backend autoritativo):
 *   - Si el servidor está disponible, es la fuente de verdad: emite el JWT,
 *     calcula los planes personalizados por nivel/crédito, persiste en la DB.
 *   - Si no responde, todas las funciones devuelven null/undefined y el
 *     frontend continúa con localStorage (NFR-007: funciona sin APIs externas).
 *
 * El access token se guarda automáticamente al verificar el OTP y se adjunta
 * como `Authorization: Bearer` en cada petición protegida.
 */

import type { Purchase, LevelName } from '../types';

const BASE_URL = 'http://localhost:3001/api';
const TIMEOUT  = 3000; // ms — no bloquear si el server no está corriendo
const TOKEN_KEY = 'kueski_token';

// ─── Manejo de token de sesión ───────────────────────────────────────────────

let accessToken: string | null = readToken();

function readToken(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  accessToken = token;
  try {
    if (typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* private mode / quota */ }
}

export function getToken(): string | null {
  return accessToken;
}

// ─── Utilidad de fetch con timeout y auth ────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const headers: Record<string, string> = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers as Record<string, string>),
    };
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // servidor apagado o sin red → fallback a localStorage
  } finally {
    clearTimeout(timer);
  }
}

const body = (data: unknown) => JSON.stringify(data);

// ─── Tipos de respuesta ──────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  level: LevelName;
  creditLimit: number;
  availableCredit: number;
  cashbackRate: number;
  score: number;
  nextPayment: { amount: number; date: string };
}

export interface ApiDeal {
  id: number;
  site: string;
  title: string;
  description: string;
  discount: string;
  tag: string;
  color: string;
  isActive: boolean;
}

export interface ApiPlan {
  periods: number;
  paymentPerPeriod: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  requiresLevel: LevelName | null;
}

export interface ApiPlansResponse {
  approved: boolean;
  availableCredit: number;
  plans: ApiPlan[];
}

export interface ApiScore {
  points: number;
  level: LevelName;
  pointsToNextLevel: number | null;
  nextLevel: LevelName | null;
  achievements: { id: string; title: string; completed: boolean; points: number }[];
}

export interface UserPreferences {
  disabledSites: string[];
  notifications?: { deals: boolean; reminders: boolean };
}

export interface CashbackHistory {
  totalEarned: number;
  history: { purchaseId: string; site: string; purchaseAmount: number; cashbackAmount: number; date: string }[];
}

// ─── 1. Autenticación ─────────────────────────────────────────────────────────

/** Solicita el envío de un código OTP. Devuelve `devCode` en modo demo. */
export async function sendOtp(identifier: string): Promise<{ ok: boolean; expiresIn: number; devCode?: string } | null> {
  return apiFetch('/auth/send-otp', { method: 'POST', body: body({ identifier }) });
}

/** Verifica el código OTP. Si es válido guarda el token y devuelve el perfil. */
export async function verifyOtp(identifier: string, code: string): Promise<ApiUser | null> {
  const res = await apiFetch<{ accessToken: string; refreshToken: string; user: ApiUser }>(
    '/auth/verify-otp',
    { method: 'POST', body: body({ identifier, code }) }
  );
  if (res?.accessToken) {
    setToken(res.accessToken);
    return res.user;
  }
  return null;
}

/** Cierra la sesión en el servidor y limpia el token local. */
export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
  setToken(null);
}

// ─── 2. Usuario ─────────────────────────────────────────────────────────────

export async function fetchUser(): Promise<ApiUser | null> {
  return apiFetch<ApiUser>('/user');
}

export async function fetchPreferences(): Promise<UserPreferences | null> {
  return apiFetch<UserPreferences>('/user/preferences');
}

export async function savePreferences(prefs: Partial<UserPreferences>): Promise<void> {
  await apiFetch('/user/preferences', { method: 'PUT', body: body(prefs) });
}

// ─── 3. Score y gamificación ──────────────────────────────────────────────────

export async function fetchScore(): Promise<ApiScore | null> {
  return apiFetch<ApiScore>('/user/score');
}

/** Actualiza los puntos totales del usuario en el backend. */
export async function updateScore(points: number, action?: string): Promise<void> {
  await apiFetch('/user/score', { method: 'PUT', body: body({ points, action }) });
}

export async function completeAchievement(achievementId: string): Promise<void> {
  await apiFetch(`/user/achievements/${encodeURIComponent(achievementId)}/complete`, { method: 'POST' });
}

// ─── 4. Deals ─────────────────────────────────────────────────────────────────

export async function fetchDeals(site: string): Promise<ApiDeal[] | null> {
  return apiFetch<ApiDeal[]>(`/deals?site=${encodeURIComponent(site)}`);
}

export async function subscribeDeal(dealId: number): Promise<void> {
  await apiFetch(`/deals/${dealId}/subscribe`, { method: 'POST' });
}

// ─── 5. Compras ───────────────────────────────────────────────────────────────

/** Pide al backend los planes de pago personalizados por nivel y crédito. */
export async function calculatePlans(cartTotal: number): Promise<ApiPlansResponse | null> {
  return apiFetch<ApiPlansResponse>('/purchases/calculate-plans', {
    method: 'POST',
    body: body({ cartTotal }),
  });
}

export async function savePurchase(purchase: Purchase): Promise<void> {
  await apiFetch('/purchases', {
    method: 'POST',
    body: body({
      id: purchase.id,
      site: purchase.site,
      amount: purchase.amount,
      plan: purchase.plan,
      paymentPerPeriod: purchase.paymentPerPeriod,
      cashback: purchase.cashback,
      date: purchase.date,
      status: purchase.status,
    }),
  });
}

export async function fetchPurchases(): Promise<Purchase[] | null> {
  return apiFetch<Purchase[]>('/purchases');
}

export async function fetchPurchase(purchaseId: string): Promise<Purchase | null> {
  return apiFetch<Purchase>(`/purchases/${encodeURIComponent(purchaseId)}`);
}

export async function updatePurchaseStatus(purchaseId: string, status: 'activo' | 'pagado'): Promise<void> {
  await apiFetch(`/purchases/${encodeURIComponent(purchaseId)}/status`, {
    method: 'PUT',
    body: body({ status }),
  });
}

// ─── 6. Cashback ──────────────────────────────────────────────────────────────

export async function fetchCashback(): Promise<CashbackHistory | null> {
  return apiFetch<CashbackHistory>('/user/cashback');
}
