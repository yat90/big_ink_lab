import { unzipSync } from 'fflate';
import { gunzipSync } from 'node:zlib';
import { Readable } from 'node:stream';
import { extract } from 'tar-stream';
import type { Headers } from 'tar-stream';
import type { DuelsReplayV1 } from './duels-replay.parser';
import { getMatchViewId, parseDuelsReplayGzip } from './duels-replay.parser';
import { BULK_NO_MATCHVIEW_PREFIX } from './duels-ink.constants';

/**
 * Bulk upload as a `.zip`: day folders and `.gz` game files inside (same layout as tar).
 * Returns map of archive path → gzip bytes for each game file.
 */
export function extractInnerGzFilesFromZip(zipBuffer: Buffer): Map<string, Buffer> {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(zipBuffer));
  } catch {
    throw new Error('File is not a valid ZIP archive.');
  }
  const files = new Map<string, Buffer>();
  for (const [name, data] of Object.entries(entries)) {
    if (!data?.length) continue;
    const norm = name.replace(/\\/g, '/');
    if (norm.toLowerCase().endsWith('.gz')) {
      files.set(norm, Buffer.from(data));
    }
  }
  return files;
}

/**
 * Outer upload: one gzip-wrapped tar with day folders and `.gz` game files inside.
 * Returns map of archive path → gzip bytes for each game file.
 */
export async function extractInnerGzFilesFromTarGz(outerGz: Buffer): Promise<Map<string, Buffer>> {
  let tarball: Buffer;
  try {
    tarball = gunzipSync(outerGz);
  } catch {
    throw new Error('Outer file is not valid gzip (expected a .tar.gz).');
  }
  const files = new Map<string, Buffer>();
  const ext = extract();
  await new Promise<void>((resolve, reject) => {
    ext.on('entry', (header: Headers, stream: Readable, next: (err?: unknown) => void) => {
      const name = header.name.replace(/\\/g, '/');
      const isFile = header.type === 'file';
      if (isFile && name.toLowerCase().endsWith('.gz')) {
        const chunks: Buffer[] = [];
        stream.on('data', (c: Buffer) => chunks.push(c));
        stream.on('end', () => {
          files.set(name, Buffer.concat(chunks));
          next();
        });
        stream.on('error', reject);
      } else {
        stream.resume();
        next();
      }
    });
    ext.on('finish', () => resolve());
    ext.on('error', reject);
    const rs = new Readable();
    rs.push(tarball);
    rs.push(null);
    rs.pipe(ext);
  });
  return files;
}

/**
 * Bulk archive: `.zip` (PK…) or gzip-compressed tar (`.tar.gz`, magic `1f 8b`).
 * Collects every `.gz` file inside for replay parsing.
 */
export async function extractInnerGzFilesFromBulkArchive(buf: Buffer): Promise<Map<string, Buffer>> {
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
    return extractInnerGzFilesFromZip(buf);
  }
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return extractInnerGzFilesFromTarGz(buf);
  }
  throw new Error('Expected a .zip file or a gzip-compressed tar (.tar.gz).');
}

/** Parse every inner `.gz` as a duels replay; paths are preserved only for error messages. */
export function parseAllInnerReplays(innerGzByPath: Map<string, Buffer>): DuelsReplayV1[] {
  const replays: DuelsReplayV1[] = [];
  const paths = [...innerGzByPath.keys()].sort((a, b) => a.localeCompare(b));
  for (const path of paths) {
    const buf = innerGzByPath.get(path);
    if (!buf) continue;
    try {
      replays.push(parseDuelsReplayGzip(new Uint8Array(buf)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'parse error';
      throw new Error(`Invalid game replay gzip at "${path}": ${msg}`);
    }
  }
  return replays;
}

export function isBulkNoMatchViewGroupKey(key: string): boolean {
  return key.startsWith(BULK_NO_MATCHVIEW_PREFIX);
}

/**
 * Group replays by `baseSnapshot.matchView.id` when present.
 * Replays without `matchView` each get their own group → one match, one game (`gameId` in key).
 */
export function groupReplaysByMatchViewId(replays: DuelsReplayV1[]): Map<string, DuelsReplayV1[]> {
  const grouped = new Map<string, DuelsReplayV1[]>();
  for (const r of replays) {
    const mid = getMatchViewId(r)?.trim();
    const key = mid ? mid : `${BULK_NO_MATCHVIEW_PREFIX}${r.gameId}`;
    const list = grouped.get(key) ?? [];
    list.push(r);
    grouped.set(key, list);
  }
  return grouped;
}
