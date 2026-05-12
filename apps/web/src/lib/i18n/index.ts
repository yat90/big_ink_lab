import { derived, get, writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import en from './dictionaries/en';
import de from './dictionaries/de';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from '$lib/storage';

export type Locale = 'en' | 'de';

const dictionaries = { en, de } as const;

type Dict = (typeof dictionaries)[Locale];

function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object' || !(p in (cur as object))) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** Replace `{name}`-style placeholders in a string. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`
  );
}

export function translate(
  locale: Locale,
  path: string,
  vars?: Record<string, string | number>
): string {
  const raw =
    getByPath(dictionaries[locale] as Dict, path) ??
    getByPath(dictionaries.en as Dict, path) ??
    path;
  return interpolate(raw, vars);
}

function readStoredLocale(): Locale | null {
  const raw = getStorageItem<string>(STORAGE_KEYS.LOCALE);
  if (raw === 'en' || raw === 'de') return raw;
  return null;
}

function browserDefaultLocale(): Locale {
  if (!browser) return 'en';
  const lang = navigator.language?.toLowerCase() ?? 'en';
  return lang.startsWith('de') ? 'de' : 'en';
}

/** Call once on the client (e.g. root layout onMount) before first paint preference matters. */
export function initLocale(): void {
  if (!browser) return;
  const stored = readStoredLocale();
  locale.set(stored ?? browserDefaultLocale());
}

export const locale = writable<Locale>('en');

function syncDocumentLanguage(next: Locale): void {
  if (!browser) return;
  try {
    document.documentElement.lang = next === 'de' ? 'de' : 'en';
  } catch {
    /* ignore */
  }
}

if (browser) {
  const stored = readStoredLocale();
  locale.set(stored ?? browserDefaultLocale());
  locale.subscribe((next) => {
    syncDocumentLanguage(next);
  });
}

export function setLocale(next: Locale): void {
  locale.set(next);
  setStorageItem(STORAGE_KEYS.LOCALE, next);
}

export function getLocale(): Locale {
  return get(locale);
}

/** Reactive translator: use `$t('team.tabs.members')` in components (subscribe with `$`). */
export const t: Readable<(path: string, vars?: Record<string, string | number>) => string> =
  derived(
    locale,
    ($locale) => (path: string, vars?: Record<string, string | number>) =>
      translate($locale, path, vars)
  );
