import { useState, useCallback } from 'react';
import type { ScoreState, Achievement, LevelName } from '../types';
import { storage } from '../utils/storage';
import { LEVEL_THRESHOLDS, LEVEL_ORDER } from '../constants/kueski';

function computeLevel(points: number): LevelName {
  let level: LevelName = 'Bronce';
  for (const name of LEVEL_ORDER) {
    if (points >= LEVEL_THRESHOLDS[name]) level = name;
  }
  return level;
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-payment',   title: 'Primer pago a tiempo',           completed: false, points: 25  },
  { id: 'three-purchases', title: 'Usa Kueski Pay 3 veces',         completed: false, points: 150 },
  { id: 'thirty-days',     title: 'Mantén buen historial 30 días',  completed: false, points: 150 },
  { id: 'referral',        title: 'Invita a un amigo',              completed: false, points: 300 },
];

function defaultState(): ScoreState {
  return { points: 250, level: 'Bronce', achievements: DEFAULT_ACHIEVEMENTS };
}

export function useScore() {
  const [state, setState] = useState<ScoreState>(() => {
    return storage.getScore() ?? defaultState();
  });

  const addPoints = useCallback((amount: number) => {
    setState((prev) => {
      const points = prev.points + amount;
      const level = computeLevel(points);
      const next: ScoreState = { ...prev, points, level };
      storage.setScore(next);
      return next;
    });
  }, []);

  const completeAchievement = useCallback((id: string) => {
    setState((prev) => {
      const achievement = prev.achievements.find((a) => a.id === id);
      if (!achievement || achievement.completed) return prev;
      const points = prev.points + achievement.points;
      const level = computeLevel(points);
      const achievements = prev.achievements.map((a) =>
        a.id === id ? { ...a, completed: true } : a
      );
      const next: ScoreState = { points, level, achievements };
      storage.setScore(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const fresh = defaultState();
    storage.setScore(fresh);
    setState(fresh);
  }, []);

  const nextLevelThreshold = (): number => {
    const currentIdx = LEVEL_ORDER.indexOf(state.level);
    const nextLevel = LEVEL_ORDER[currentIdx + 1];
    return nextLevel ? LEVEL_THRESHOLDS[nextLevel] : LEVEL_THRESHOLDS.Platino;
  };

  return { ...state, addPoints, completeAchievement, reset, nextLevelThreshold };
}
