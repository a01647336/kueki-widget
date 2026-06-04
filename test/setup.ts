import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';
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
});

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) },
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
