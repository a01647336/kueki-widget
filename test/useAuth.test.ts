import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../src/hooks/useAuth';

beforeEach(() => {
  localStorage.clear();
});

describe('useAuth', () => {
  it('inicia sin sesión si localStorage está vacío', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('login establece isLoggedIn en true', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login('carlos@test.com'); });
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('login guarda el email del usuario', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login('ana@test.com'); });
    expect(result.current.user?.email).toBe('ana@test.com');
  });

  it('login asigna datos simulados del usuario (nombre, nivel, crédito)', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login('test@test.com'); });
    expect(result.current.user?.name).toBeDefined();
    expect(result.current.user?.level).toBe('Bronce');
    expect(result.current.user?.creditLimit).toBeGreaterThan(0);
  });

  it('logout limpia el estado', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login('test@test.com'); });
    act(() => { result.current.logout(); });
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('logout elimina los datos de localStorage', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login('test@test.com'); });
    act(() => { result.current.logout(); });
    expect(localStorage.getItem('kueski_auth')).toBeNull();
  });

  it('restaura la sesión desde localStorage si existe', () => {
    const mockAuth = {
      isLoggedIn: true,
      user: {
        name: 'Carlos',
        email: 'carlos@test.com',
        level: 'Plata',
        creditLimit: 8000,
        availableCredit: 5000,
        cashbackRate: 0.015,
        nextPayment: { date: '2026-06-01', amount: 500 },
        score: 700,
      },
    };
    localStorage.setItem('kueski_auth', JSON.stringify(mockAuth));
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.email).toBe('carlos@test.com');
    expect(result.current.user?.level).toBe('Plata');
  });

  it('cashbackRate corresponde al nivel Bronce', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login('test@test.com'); });
    expect(result.current.user?.cashbackRate).toBe(0.005);
  });
});
