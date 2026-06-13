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

// Configurable por entorno de Plasmo (PLASMO_PUBLIC_API_URL). En producción
// apunta a la URL pública de Render; en dev cae a localhost.
const BASE_URL = process.env.PLASMO_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const TIMEOUT  = 8000; // ms — margen para el cold start del server en la nube
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

/** Variante que conserva el status HTTP (para distinguir 401 de "sin servidor"). */
async function apiFetchRaw<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const headers: Record<string, string> = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers as Record<string, string>),
    };
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
    const data = res.ok ? ((await res.json()) as T) : null;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null }; // status 0 = servidor no disponible
  } finally {
    clearTimeout(timer);
  }
}

const body = (data: unknown) => JSON.stringify(data);

// ─── Tipos de respuesta ──────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  name: string;
  username?: string;
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
  discountType: string | null;
  discountValue: number;
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

export interface AppliedDeal {
  id: number;
  title: string;
  discountType: string;
  discountValue: number;
}

export interface ApiPlansResponse {
  approved: boolean;
  reason: string | null;
  message: string | null;
  availableCredit: number;
  effectiveTotal: number;
  cashback: number;
  appliedDeal: AppliedDeal | null;
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

export interface LoginResult {
  ok: boolean;
  user: ApiUser | null;
  /** true si el servidor respondió pero rechazó las credenciales (401). */
  invalidCredentials: boolean;
}

/**
 * Inicia sesión con usuario + contraseña. Si es válido guarda el token y
 * devuelve el perfil. Distingue entre "credenciales inválidas" (servidor
 * respondió 401) y "servidor no disponible" para que la UI muestre el mensaje
 * correcto.
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await apiFetchRaw<{ accessToken: string; refreshToken: string; user: ApiUser }>(
    '/auth/login',
    { method: 'POST', body: body({ username, password }) }
  );
  if (res.ok && res.data?.accessToken) {
    setToken(res.data.accessToken);
    return { ok: true, user: res.data.user, invalidCredentials: false };
  }
  return { ok: false, user: null, invalidCredentials: res.status === 401 };
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

/** Pide al backend los planes de pago personalizados por nivel, crédito y deal activo del sitio. */
export async function calculatePlans(cartTotal: number, site?: string): Promise<ApiPlansResponse | null> {
  return apiFetch<ApiPlansResponse>('/purchases/calculate-plans', {
    method: 'POST',
    body: body({ cartTotal, site }),
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
      dealId: purchase.dealId ?? null,
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

// ─── 6. Calendario de pagos ───────────────────────────────────────────────────

export interface UpcomingPaymentApi {
  purchaseId: string;
  site: string;
  amount: number;
  dueDate: string;
  installmentNumber: number;
  totalInstallments: number;
  remaining: number;
  overdue: boolean;
  daysUntilDue: number;
}

export interface PayInstallmentResult {
  ok: boolean;
  purchase: Purchase;
  availableCredit: number;
  nextPayment: { date: string; amount: number } | null;
}

export async function fetchUpcomingPayments(): Promise<UpcomingPaymentApi[] | null> {
  return apiFetch<UpcomingPaymentApi[]>('/user/payments/upcoming');
}

export async function payInstallment(purchaseId: string): Promise<PayInstallmentResult | null> {
  return apiFetch<PayInstallmentResult>(`/purchases/${encodeURIComponent(purchaseId)}/pay-installment`, {
    method: 'POST',
  });
}

// ─── 7. Cashback ──────────────────────────────────────────────────────────────

export async function fetchCashback(): Promise<CashbackHistory | null> {
  return apiFetch<CashbackHistory>('/user/cashback');
}
