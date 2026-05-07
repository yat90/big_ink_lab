/** User-facing strings for failed requests (issue #30). */

export const ERR = {
  network: "Couldn't connect — check your connection and try again.",
  loadDashboard: "Couldn't load the dashboard. Try again.",
  loadMatches: "Couldn't load matches. Try again.",
  loadPlayers: "Couldn't load players. Try again.",
  loadDecks: "Couldn't load decks. Try again.",
  createMatch: "Couldn't create the match. Try again.",
  generic: 'Something went wrong. Try again.',
} as const;

export function messageFromHttpStatus(status: number): string {
  if (status === 401) return 'Your session ended. Please sign in again.';
  if (status === 404) return 'That page no longer exists.';
  if (status >= 500) return 'Something went wrong on our end. Try again in a minute.';
  return `Something went wrong (${status}). Try again.`;
}

/** Map a failed JSON response or network error to a short user message. */
export async function messageFromFailedResponse(
  res: Response | null,
  fallback: string
): Promise<string> {
  if (!res) return ERR.network;
  try {
    const data = (await res.json()) as { message?: string | string[] };
    const m = data.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string' && m.trim()) return m.trim();
  } catch {
    /* ignore */
  }
  return messageFromHttpStatus(res.status) || fallback;
}
