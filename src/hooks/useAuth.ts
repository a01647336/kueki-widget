import { useState, useCallback } from 'react';
import type { User } from '../types';
import { storage } from '../utils/storage';
import { logout as apiLogout, type ApiUser } from '../utils/api';

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
}

/** Mapea el perfil del backend al tipo local `User`. */
function toUser(api: ApiUser): User {
  return {
    name: api.name,
    email: api.email ?? api.username,
    level: api.level,
    creditLimit: api.creditLimit,
    availableCredit: api.availableCredit,
    cashbackRate: api.cashbackRate,
    nextPayment: api.nextPayment,
    score: api.score,
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const saved = storage.getAuth();
    return saved ?? { isLoggedIn: false, user: null };
  });

  /** Recibe el perfil real del backend (devuelto por `api.login`). */
  const login = useCallback((apiUser: ApiUser) => {
    const user = toUser(apiUser);
    const newState: AuthState = { isLoggedIn: true, user };
    storage.setAuth(newState);
    setState(newState);
  }, []);

  const logout = useCallback(() => {
    storage.clearAuth();
    storage.clearScore();
    void apiLogout(); // invalida la sesión en el server y limpia el token local
    setState({ isLoggedIn: false, user: null });
  }, []);

  return { ...state, login, logout };
}
