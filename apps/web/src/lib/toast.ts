import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Feedback taxonomy — choose the right pattern for the situation:
 *
 * toast (this module)
 *   Transient notification that auto-dismisses after ~4 s. Appears as a
 *   floating overlay so it does not displace page content.
 *   ✔ Successful mutations: "Player saved", "Match created", "Deck updated"
 *   ✔ Non-blocking info that does not require action
 *   ✘ Do NOT use for errors that the user must act on before continuing
 *
 *   In-page (same render cycle):
 *     import { toast } from '$lib/toast';
 *     toast.success('Player saved');
 *
 *   After navigation (call before goto(), AppToast picks it up via afterNavigate):
 *     toast.schedule('Player created', 'success');
 *     await goto('/players');
 *
 * AppBanner
 *   Persistent inline feedback rendered inside the page. Stays visible until
 *   the user fixes the problem or navigates away.
 *   ✔ Form validation errors or mutation failures that need action
 *   ✔ Network / API errors that block the current operation
 *   Placement: inside the form, above the submit button.
 *
 * Inline / field-level
 *   Validation error tied to a specific input field.
 *   ✔ Use native required + :invalid CSS for client-side rules
 *   ✔ Use a .hint span next to the field for API-returned field errors
 */

export type ToastVariant = 'success' | 'info' | 'warning' | 'danger';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

const PENDING_KEY = 'toast:pending';

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function add(message: string, variant: ToastVariant = 'info', duration = 4000): string {
    const id = crypto.randomUUID();
    update((ts) => [...ts, { id, message, variant }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }

  function dismiss(id: string) {
    update((ts) => ts.filter((t) => t.id !== id));
  }

  /**
   * Persist a toast in sessionStorage so it survives the next SvelteKit
   * navigation. Call this before `goto()` — AppToast reads it via afterNavigate.
   */
  function schedule(message: string, variant: ToastVariant = 'success') {
    if (!browser) return;
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ message, variant }));
  }

  return {
    subscribe,
    success: (msg: string, duration?: number) => add(msg, 'success', duration),
    info: (msg: string, duration?: number) => add(msg, 'info', duration),
    warning: (msg: string, duration?: number) => add(msg, 'warning', duration),
    danger: (msg: string, duration?: number) => add(msg, 'danger', duration),
    dismiss,
    schedule,
  };
}

export const toast = createToastStore();

/** Read and clear the pending sessionStorage toast. Called internally by AppToast. */
export function consumePendingToast(): { message: string; variant: ToastVariant } | null {
  if (!browser) return null;
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_KEY);
  try {
    return JSON.parse(raw) as { message: string; variant: ToastVariant };
  } catch {
    return null;
  }
}
