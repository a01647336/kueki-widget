import { Storage } from "@plasmohq/storage";
import type { User, ScoreState, Purchase, UserPreferences } from "../types";

const KEYS = {
  AUTH:    "kueski_auth",
  SCORE:   "kueski_score",
  HISTORY: "kueski_history",
  PREFS:   "kueski_prefs",
} as const;

export interface AuthData {
  isLoggedIn: boolean;
  user: User | null;
}

/**
 * Wrapper síncrono sobre @plasmohq/storage.
 *
 * @plasmohq/storage usa chrome.storage.local cuando está disponible
 * (en la extensión) y cae a localStorage en otros entornos (tests/dev).
 *
 * Mantenemos una caché en memoria para preservar la API síncrona que
 * usan los hooks (useAuth, useScore, useCart) sin necesidad de refactor.
 * `hydrate()` debe llamarse una vez al boot del content script para
 * cargar los valores persistidos antes de renderizar React.
 */
class SyncStorageCache {
  private cache: Record<string, unknown> = {};
  private store = new Storage({ area: "local" });
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    const entries = await Promise.all(
      Object.values(KEYS).map(async (k) => [k, await this.store.get(k)] as const)
    );
    for (const [k, v] of entries) {
      if (v !== undefined && v !== null) this.cache[k] = v;
    }
    this.hydrated = true;
  }

  private read<T>(key: string): T | null {
    if (key in this.cache) return (this.cache[key] as T) ?? null;
    // Fallback síncrono: leer de localStorage directo. Útil cuando
    // no hubo hydrate previo (tests, mount inicial) y la página
    // host comparte el mismo origen del extension storage fallback.
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      const v = raw ? (JSON.parse(raw) as T) : null;
      if (v !== null) this.cache[key] = v;
      return v;
    } catch {
      return null;
    }
  }

  private write<T>(key: string, value: T): void {
    this.cache[key] = value;
    // Persistencia síncrona inmediata (localStorage) + chrome.storage async.
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch { /* quota / private mode */ }
    void this.store.set(key, value as never);
  }

  private remove(key: string): void {
    delete this.cache[key];
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    } catch { /* ignore */ }
    void this.store.remove(key);
  }

  getAuth     = ()                       => this.read<AuthData>(KEYS.AUTH);
  setAuth     = (v: AuthData)            => this.write(KEYS.AUTH, v);
  clearAuth   = ()                       => this.remove(KEYS.AUTH);

  getScore    = ()                       => this.read<ScoreState>(KEYS.SCORE);
  setScore    = (v: ScoreState)          => this.write(KEYS.SCORE, v);
  clearScore  = ()                       => this.remove(KEYS.SCORE);

  getHistory  = ()                       => this.read<Purchase[]>(KEYS.HISTORY) ?? [];
  setHistory  = (v: Purchase[])          => this.write(KEYS.HISTORY, v);
  clearHistory= ()                       => this.remove(KEYS.HISTORY);

  getPrefs    = ()                       => this.read<UserPreferences>(KEYS.PREFS) ?? { disabledSites: [] };
  setPrefs    = (v: UserPreferences)     => this.write(KEYS.PREFS, v);

  /** Solo para tests: limpia la caché en memoria. */
  _resetForTesting(): void {
    this.cache = {};
    this.hydrated = false;
  }
}

export const storage = new SyncStorageCache();

/** Llamar una vez al inicio del content script antes de renderizar React. */
export const hydrateStorage = () => storage.hydrate();
