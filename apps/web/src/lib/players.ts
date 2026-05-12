export function playerName(p: { name?: string } | string | undefined): string {
  if (!p) return '–';
  return typeof p === 'string' ? p : (p.name ?? '–');
}
