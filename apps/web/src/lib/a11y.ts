/**
 * Accessibility helpers for modal/dialog components.
 *
 * - `focusTrap` keeps Tab/Shift+Tab inside the dialog, focuses an initial
 *   element on mount, and restores focus to the previously focused element
 *   on destroy.
 * - `scrollLock` prevents the page underneath the dialog from scrolling.
 *   Reference-counted so multiple stacked dialogs unlock correctly.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function getFocusable(node: HTMLElement): HTMLElement[] {
  const nodes = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(nodes).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  );
}

export interface FocusTrapOptions {
  /** Element to focus on mount. Defaults to the first focusable child. */
  initialFocus?: HTMLElement | null;
  /**
   * Focus the trap root (`node`) first. Pair with `tabindex="-1"` on the root so the first
   * focusable child (e.g. a search field) does not steal focus on open (mobile keyboard).
   */
  focusRoot?: boolean;
}

/**
 * Svelte action: trap Tab focus inside `node` while it is mounted.
 * Restores focus to the previously focused element on destroy.
 */
export function focusTrap(node: HTMLElement, opts: FocusTrapOptions = {}) {
  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const focusInitial = () => {
    if (opts.focusRoot) {
      if (!node.hasAttribute('tabindex')) {
        node.setAttribute('tabindex', '-1');
      }
      node.focus({ preventScroll: true });
      return;
    }
    const target =
      opts.initialFocus && node.contains(opts.initialFocus)
        ? opts.initialFocus
        : (getFocusable(node)[0] ?? node);
    if (!target.hasAttribute('tabindex') && target === node) {
      node.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  };

  // Defer to next microtask so the node and its children are fully mounted.
  Promise.resolve().then(focusInitial);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const focusable = getFocusable(node);
    if (focusable.length === 0) {
      event.preventDefault();
      node.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const goingBackward = event.shiftKey;
    if (!goingBackward && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    } else if (goingBackward && (active === first || !node.contains(active))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    }
  };

  node.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      node.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    },
  };
}

let scrollLockCount = 0;
let savedBodyOverflow = '';

/**
 * Svelte action: lock body scroll while `node` is mounted.
 * Reference-counted so multiple concurrent dialogs unlock correctly.
 */
export function scrollLock(node: HTMLElement) {
  // The node arg is required by the Svelte action signature; the lock is
  // applied globally to <body>, not to `node` itself.
  void node;
  if (scrollLockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;

  return {
    destroy() {
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) {
        document.body.style.overflow = savedBodyOverflow;
        savedBodyOverflow = '';
      }
    },
  };
}
