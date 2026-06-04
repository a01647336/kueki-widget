import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScore } from '../src/hooks/useScore';

beforeEach(() => {
  localStorage.clear();
});

describe('useScore', () => {
  it('inicializa con 250 puntos y nivel Bronce si no hay datos guardados', () => {
    const { result } = renderHook(() => useScore());
    expect(result.current.points).toBe(250);
    expect(result.current.level).toBe('Bronce');
  });

  it('addPoints incrementa los puntos correctamente', () => {
    const { result } = renderHook(() => useScore());
    act(() => { result.current.addPoints(50); });
    expect(result.current.points).toBe(300);
  });

  it('sube de nivel cuando los puntos superan el umbral de Plata (500)', () => {
    const { result } = renderHook(() => useScore());
    act(() => { result.current.addPoints(300); }); // 250 + 300 = 550
    expect(result.current.level).toBe('Plata');
  });

  it('sube de nivel a Oro al superar 1500 puntos', () => {
    const { result } = renderHook(() => useScore());
    act(() => { result.current.addPoints(1300); }); // 250 + 1300 = 1550
    expect(result.current.level).toBe('Oro');
  });

  it('sube de nivel a Platino al superar 4000 puntos', () => {
    const { result } = renderHook(() => useScore());
    act(() => { result.current.addPoints(4000); }); // 250 + 4000 = 4250
    expect(result.current.level).toBe('Platino');
  });

  it('persiste los puntos en localStorage', () => {
    const { result } = renderHook(() => useScore());
    act(() => { result.current.addPoints(100); });
    const saved = JSON.parse(localStorage.getItem('kueski_score')!);
    expect(saved.points).toBe(350);
  });

  it('carga los puntos desde localStorage si ya existen', () => {
    localStorage.setItem('kueski_score', JSON.stringify({
      points: 750,
      level: 'Plata',
      achievements: [],
    }));
    const { result } = renderHook(() => useScore());
    expect(result.current.points).toBe(750);
    expect(result.current.level).toBe('Plata');
  });

  it('completeAchievement suma puntos del logro', () => {
    const { result } = renderHook(() => useScore());
    const initialPoints = result.current.points;
    const achievement = result.current.achievements[0];
    act(() => { result.current.completeAchievement(achievement.id); });
    expect(result.current.points).toBe(initialPoints + achievement.points);
    expect(result.current.achievements.find((a) => a.id === achievement.id)?.completed).toBe(true);
  });

  it('completeAchievement no suma puntos si ya está completado', () => {
    const { result } = renderHook(() => useScore());
    const achievement = result.current.achievements[0];
    act(() => { result.current.completeAchievement(achievement.id); });
    const pointsAfterFirst = result.current.points;
    act(() => { result.current.completeAchievement(achievement.id); });
    expect(result.current.points).toBe(pointsAfterFirst);
  });

  it('reset vuelve al estado inicial', () => {
    const { result } = renderHook(() => useScore());
    act(() => { result.current.addPoints(500); });
    act(() => { result.current.reset(); });
    expect(result.current.points).toBe(250);
    expect(result.current.level).toBe('Bronce');
  });

  it('nextLevelThreshold retorna 500 cuando el nivel es Bronce', () => {
    const { result } = renderHook(() => useScore());
    expect(result.current.nextLevelThreshold()).toBe(500);
  });

  it('nextLevelThreshold retorna 4000 cuando el nivel es Platino', () => {
    const { result } = renderHook(() => useScore());
    act(() => { result.current.addPoints(4000); });
    expect(result.current.level).toBe('Platino');
    expect(result.current.nextLevelThreshold()).toBe(4000);
  });
});
