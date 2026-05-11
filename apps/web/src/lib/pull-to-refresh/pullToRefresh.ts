import type { Action } from 'svelte/action';
import { PULL_TO_REFRESH_THRESHOLD } from '$lib/pull-to-refresh/pullToRefreshConstants';
import { clearPullToRefreshUI, pullDistance, pullRefreshing } from '$lib/pull-to-refresh/pullToRefreshState';
import { runPageRefresh } from '$lib/pageRefreshRegistry';

type PullToRefreshParams = { disabled?: boolean };

/**
 * Mobile-style pull-to-refresh: the app scrolls inside `main` (not the document), so the
 * browser’s native gesture never runs. Calls `registerPageRefresh()` from the active route if set,
 * otherwise `location.reload()`.
 */
export const pullToRefresh: Action<HTMLElement, PullToRefreshParams | undefined> = (
  node,
  params
) => {
  let disabled = params?.disabled ?? false;
  let startY = 0;
  let tracking = false;
  let maxPull = 0;

  function resetTracking() {
    tracking = false;
    maxPull = 0;
  }

  function reset() {
    resetTracking();
    pullDistance.set(0);
  }

  function onTouchStart(e: TouchEvent) {
    if (disabled) return;
    if (node.scrollTop > 2) return;
    startY = e.touches[0].clientY;
    tracking = true;
    maxPull = 0;
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking || disabled) return;
    if (node.scrollTop > 2) {
      reset();
      return;
    }
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      maxPull = Math.max(maxPull, dy);
      pullDistance.set(Math.min(dy, PULL_TO_REFRESH_THRESHOLD * 1.35));
      if (dy > 10) e.preventDefault();
    } else {
      pullDistance.set(0);
    }
  }

  function onTouchEnd() {
    if (!tracking || disabled) {
      reset();
      return;
    }
    const shouldRefresh = maxPull >= PULL_TO_REFRESH_THRESHOLD && node.scrollTop <= 2;
    reset();
    if (shouldRefresh) {
      pullRefreshing.set(true);
      void runPageRefresh().finally(() => {
        pullRefreshing.set(false);
      });
    }
  }

  function onTouchCancel() {
    reset();
  }

  node.addEventListener('touchstart', onTouchStart, { passive: true });
  node.addEventListener('touchmove', onTouchMove, { passive: false });
  node.addEventListener('touchend', onTouchEnd, { passive: true });
  node.addEventListener('touchcancel', onTouchCancel, { passive: true });

  return {
    update(p: PullToRefreshParams | undefined) {
      disabled = p?.disabled ?? false;
      if (disabled) clearPullToRefreshUI();
    },
    destroy() {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchCancel);
      clearPullToRefreshUI();
    },
  };
};
