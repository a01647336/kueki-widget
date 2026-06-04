/**
 * api.ts — Cliente HTTP para el backend del Kueski Smart Widget
 *
 * Todas las funciones tienen fallback silencioso:
 * si el servidor no está disponible, devuelven null/undefined
 * y el frontend continúa usando localStorage.
 */

import type { Purchase } from '../types';

const BASE_URL = 'http://localhost:3001/api';
const TIMEOUT  = 3000; // ms — no bloquear si el server no está corriendo

// ─── Utilidad de fetch con timeout ──────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // servidor apagado o sin red → fallback a localStorage
  } finally {
    clearTimeout(timer);
  }
}

// ─── Tipos de respuesta ──────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  level: 'Bronce' | 'Plata' | 'Oro' | 'Platino';
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

// ─── Funciones públicas ──────────────────────────────────────────────────────

/** Obtiene los datos del usuario desde el backend. */
export async function fetchUser(): Promise<ApiUser | null> {
  return apiFetch<ApiUser>('/user');
}

/** Actualiza el score del usuario en el backend. */
export async function updateScore(points: number): Promise<void> {
  await apiFetch('/user/score', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  });
}

/** Obtiene las ofertas activas para un sitio específico. */
export async function fetchDeals(site: string): Promise<ApiDeal[] | null> {
  return apiFetch<ApiDeal[]>(`/deals?site=${encodeURIComponent(site)}`);
}

/** Obtiene el historial de compras desde el backend. */
export async function fetchPurchases(): Promise<Purchase[] | null> {
  return apiFetch<Purchase[]>('/purchases');
}

/** Registra una nueva compra en el backend. */
export async function savePurchase(purchase: Purchase): Promise<void> {
  await apiFetch('/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id:               purchase.id,
      site:             purchase.site,
      amount:           purchase.amount,
      plan:             purchase.plan,
      paymentPerPeriod: purchase.paymentPerPeriod,
      cashback:         purchase.cashback,
      date:             purchase.date,
      status:           purchase.status,
    }),
  });
}
