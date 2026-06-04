import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../src/hooks/useAuth';
import type { ApiUser } from '../src/utils/api';

const API_USER: ApiUser = {
  id: 'u_ana',
  name: 'Ana Torres',
  username: 'ana',
  email: 'ana',
  level: 'Plata',
  creditLimit: 8000,
  availableCredit: 6000,
  cashbackRate: 0.015,
  score: 800,
  nextPayment: { date: '2026-06-01', amount: 649.5 },
};

beforeEach(() => {
  localStorage.clear();
});

describe('useAuth', () => {
  it('inicia sin sesión si localStorage está vacío', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('login establece la sesión con el perfil del backend', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login(API_USER); });
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.name).toBe('Ana Torres');
    expect(result.current.user?.level).toBe('Plata');
    expect(result.current.user?.creditLimit).toBe(8000);
  });

  it('login guarda el email/usuario', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login(API_USER); });
    expect(result.current.user?.email).toBe('ana');
  });

  it('logout limpia el estado', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login(API_USER); });
    act(() => { result.current.logout(); });
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('logout elimina los datos de localStorage', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login(API_USER); });
    act(() => { result.current.logout(); });
    expect(localStorage.getItem('kueski_auth')).toBeNull();
  });

  it('persiste la sesión en localStorage tras login', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login(API_USER); });
    expect(localStorage.getItem('kueski_auth')).toContain('Ana Torres');
  });

  it('restaura la sesión desde localStorage si existe', () => {
    const mockAuth = {
      isLoggedIn: true,
      user: {
        name: 'Carlos', email: 'carlos', level: 'Bronce',
        creditLimit: 2500, availableCredit: 1950, cashbackRate: 0.005,
        nextPayment: { date: '2026-06-01', amount: 500 }, score: 250,
      },
    };
    localStorage.setItem('kueski_auth', JSON.stringify(mockAuth));
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.email).toBe('carlos');
    expect(result.current.user?.level).toBe('Bronce');
  });

  it('cada usuario conserva su propio nivel (multiusuario)', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login({ ...API_USER, name: 'Diego', level: 'Oro', cashbackRate: 0.025 }); });
    expect(result.current.user?.level).toBe('Oro');
    expect(result.current.user?.cashbackRate).toBe(0.025);
  });
});
