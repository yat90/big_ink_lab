/** DiceBear [fun-emoji](https://www.dicebear.com/styles/fun-emoji/) — deterministic SVG avatars. */
const GLASS_SVG = 'https://api.dicebear.com/9.x/rings/svg';

export type DicebearFunEmojiAvatarOptions = {
  /** Pixel size requested from the API (square). Default 64. */
  size?: number;
};

/**
 * Deterministic avatar URL from a seed (e.g. player or team id). Same seed → same graphic.
 */
export function dicebearAvatarUrl(
  seed: string,
  options?: DicebearFunEmojiAvatarOptions
): string {
  const params = new URLSearchParams();
  params.set('seed', seed);
  params.set('size', String(options?.size ?? 64));
  return `${GLASS_SVG}?${params.toString()}`;
}
