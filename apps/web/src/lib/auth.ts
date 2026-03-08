import { browser } from '$app/environment';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

const AUTH_TOKEN_KEY = 'bil.auth.token';
const AUTH_USER_KEY = 'bil.auth.user';

export function getAuthToken(): string {
  if (!browser) return '';
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? '';
}

export function getAuthUser(): AuthUser | null {
  if (!browser) return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthSession(accessToken: string, user: AuthUser) {
  if (!browser) return;
  localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  if (!browser) return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
