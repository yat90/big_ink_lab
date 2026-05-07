import { writable } from 'svelte/store';

/** Last-segment label override when it depends on loaded data (e.g. tournament name). Must match `pathname` or it is ignored. */
export type BreadcrumbTail = { path: string; label: string };

export const breadcrumbTail = writable<BreadcrumbTail | null>(null);
