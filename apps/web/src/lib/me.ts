import { writable, type Writable } from 'svelte/store';

/** Linked player from `GET /auth/me`. */
export type MePlayer = { _id: string; name: string; team?: string };

/** Payload returned by `GET /auth/me` after login (shape used across the web app). */
export type AuthMePayload = {
  user: { name?: string; email?: string };
  player: MePlayer | null;
};

/** Cached `/auth/me` — set from `+layout.svelte` after session verification; cleared on logout. */
export const authMe: Writable<AuthMePayload | null> = writable(null);

export function setAuthMe(value: AuthMePayload | null): void {
  authMe.set(value);
}
