import { writable } from 'svelte/store';

/** Current downward pull amount while finger is down (px), for the header hint. */
export const pullDistance = writable(0);

/** True while the registered refresh handler or reload runs after release. */
export const pullRefreshing = writable(false);

export function clearPullToRefreshUI(): void {
  pullDistance.set(0);
  pullRefreshing.set(false);
}
