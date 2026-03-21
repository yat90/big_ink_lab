import { redirect } from '@sveltejs/kit';

/** Former list page — entry is only via /tournaments/results (linked from dashboard & matches). */
export function load() {
  throw redirect(302, '/tournaments/results');
}
