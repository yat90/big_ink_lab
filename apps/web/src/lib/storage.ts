export const STORAGE_KEYS = {
  AUTH_TOKEN: 'bil.auth.token',
  AUTH_USER: 'bil.auth.user',
  LOCALE: 'bil.locale',
  INSTALL_DISMISSED: 'bil.install-prompt-dismissed',
} as const;

export function getStorageItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
