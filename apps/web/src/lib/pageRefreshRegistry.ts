export type PageRefreshHandler = () => void | Promise<void>;

let handler: PageRefreshHandler | null = null;
let running = false;

/**
 * Call from a route’s `onMount` so pull-to-refresh runs the same logic as the header refresh button.
 * Returns an unsubscribe function — return it from `onMount` so the handler clears when leaving the page.
 */
export function registerPageRefresh(fn: PageRefreshHandler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

/** Prefer the registered route handler; otherwise full reload (fallback when no page registered). */
export async function runPageRefresh(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const h = handler;
    if (h) {
      await Promise.resolve(h());
    } else {
      window.location.reload();
    }
  } catch (e) {
    console.error('Pull-to-refresh handler failed', e);
  } finally {
    running = false;
  }
}
