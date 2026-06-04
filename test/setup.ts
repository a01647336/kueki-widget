import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { storage } from '../src/utils/storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:   (key: string) => store[key] ?? null,
    setItem:   (key: string, value: string) => { store[key] = value; },
    removeItem:(key: string) => { delete store[key]; },
    clear:     () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Resetear caché en memoria del storage entre tests
beforeEach(() => {
  storage._resetForTesting();
  // Por defecto simulamos que el backend NO está disponible: así se ejercita
  // el fallback offline (localStorage). Los tests de api.ts sobreescriben esto.
  global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
});

// Mock crypto.randomUUID PRESERVANDO getRandomValues/subtle reales
// (el driver de MongoDB usa getRandomValues; los tests usan randomUUID).
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
    getRandomValues: (arr: Parameters<typeof webcrypto.getRandomValues>[0]) => webcrypto.getRandomValues(arr),
    subtle: webcrypto.subtle,
  },
});

// Silence motion/react animation warnings in tests
vi.mock('motion/react', async () => {
  const React = await import('react');
  return {
    motion: new Proxy({} as Record<string, React.FC>, {
      get: (_t, tag: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ children, ...props }: any) => React.createElement(tag, props, children),
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});
