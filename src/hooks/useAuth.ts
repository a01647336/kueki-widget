import { useState, useCallback } from 'react';
import type { User } from '../types';
import { storage } from '../utils/storage';
import { POINTS, LEVEL_CASHBACK_RATES, LEVEL_CREDIT_LIMITS } from '../constants/kueski';

const MOCK_USER: Omit<User, 'email'> = {
  name: 'Carlos Mendoza',
  level: 'Bronce',
  creditLimit: LEVEL_CREDIT_LIMITS.Bronce.max,
  availableCredit: 1950,
  cashbackRate: LEVEL_CASHBACK_RATES.Bronce,
  nextPayment: { date: '2026-06-01', amount: 649.50 },
  score: 250,
};

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const saved = storage.getAuth();
    return saved ?? { isLoggedIn: false, user: null };
  });

  const login = useCallback((email: string) => {
    const user: User = { ...MOCK_USER, email };
    const scoreState = storage.getScore();
    const initialPoints = scoreState ? scoreState.points : POINTS.WELCOME;
    if (!scoreState) {
      storage.setScore({
        points: initialPoints,
        level: 'Bronce',
        achievements: defaultAchievements(),
      });
    }
    const newState: AuthState = { isLoggedIn: true, user };
    storage.setAuth(newState);
    setState(newState);
  }, []);

  const logout = useCallback(() => {
    storage.clearAuth();
    setState({ isLoggedIn: false, user: null });
  }, []);

  return { ...state, login, logout };
}

function defaultAchievements() {
  return [
    { id: 'first-payment',   title: 'Primer pago a tiempo',      completed: false, points: POINTS.ON_TIME_PAYMENT },
    { id: 'three-purchases', title: 'Usa Kueski Pay 3 veces',    completed: false, points: POINTS.PURCHASE * 3 },
    { id: 'thirty-days',     title: 'Mantén buen historial 30 días', completed: false, points: POINTS.THIRTY_DAY_STREAK },
    { id: 'referral',        title: 'Invita a un amigo',         completed: false, points: POINTS.REFERRAL },
  ];
}
