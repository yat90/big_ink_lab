import { STORAGE_KEYS, getStorageItem, setStorageItem, removeStorageItem } from '$lib/storage';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export function getAuthToken(): string {
  return getStorageItem<string>(STORAGE_KEYS.AUTH_TOKEN) ?? '';
}

export function getAuthUser(): AuthUser | null {
  return getStorageItem<AuthUser>(STORAGE_KEYS.AUTH_USER);
}

export function setAuthSession(accessToken: string, user: AuthUser) {
  setStorageItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
  setStorageItem(STORAGE_KEYS.AUTH_USER, user);
}

export function clearAuthSession() {
  removeStorageItem(STORAGE_KEYS.AUTH_TOKEN);
  removeStorageItem(STORAGE_KEYS.AUTH_USER);
}
