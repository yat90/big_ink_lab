import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PlayersService } from '../players/players.service';
import { MatchesService } from './matches.service';
import {
  duelsReplayToGame,
  inferMatchDeckColorsFromReplays,
  type DuelsReplayV1,
  parseDuelsReplaysFromBuffers,
  resolveOpponentNameFromReplays,
} from './duels-replay.parser';
import {
  extractInnerGzFilesFromBulkArchive,
  groupReplaysByMatchViewId,
  isBulkNoMatchViewGroupKey,
  parseAllInnerReplays,
} from './duels-bulk.parser';
import { Match } from './schemas/lorcana-match.schema';
import { Stage } from './schemas/stages.enum';

/** Creates matches from duels.ink gzip/zip uploads (authenticated user as P1). */
@Injectable()
export class DuelsImportService {
  constructor(
    private readonly authService: AuthService,
    private readonly playersService: PlayersService,
    private readonly matchesService: MatchesService,
  ) {}

  async createMatchFromUploads(userId: string, files: Express.Multer.File[]): Promise<Match> {
    if (!files?.length) {
      throw new BadRequestException('No files uploaded.');
    }
    const { myPlayerId, myPlayerName } = await this.requireLinkedPlayer(userId);
    const buffers = files.map((f) => ({
      originalname: f.originalname,
      buffer: f.buffer as Buffer,
    }));
    let replays: DuelsReplayV1[];
    try {
      replays = parseDuelsReplaysFromBuffers(buffers);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid replay files.');
    }
    await this.assertDuelsReplaysNotYetImported(myPlayerId, replays);
    return this.createMatchFromReplays(
      myPlayerId,
      myPlayerName,
      replays,
      `Imported from duels.ink (${replays.length} game${replays.length === 1 ? '' : 's'})`,
    );
  }

  /**
   * One bulk archive: `.zip` or `.tar.gz` with day folders and inner `.gz` per game.
   * Replays with `baseSnapshot.matchView.id` are grouped into one match per id; replays without
   * `matchView` import as a single match with one game each.
   */
  async createMatchesFromBulkArchive(userId: string, archiveBuffer: Buffer): Promise<Match[]> {
    const { myPlayerId, myPlayerName } = await this.requireLinkedPlayer(userId);
    let innerFiles: Map<string, Buffer>;
    try {
      innerFiles = await extractInnerGzFilesFromBulkArchive(archiveBuffer);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid archive.');
    }
    if (innerFiles.size === 0) {
      throw new BadRequestException('No .gz game files found in the archive.');
    }
    let replays: DuelsReplayV1[];
    try {
      replays = parseAllInnerReplays(innerFiles);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid replay data.');
    }
    if (replays.length === 0) {
      throw new BadRequestException('No valid replays parsed.');
    }
    const allGameIds = replays.map((r) => r.gameId);
    const alreadyGames = await this.matchesService.findDuelsGameIdsAlreadyImported(
      myPlayerId,
      allGameIds,
    );
    replays = replays.filter((r) => !alreadyGames.has(r.gameId));
    if (replays.length === 0) {
      throw new BadRequestException('All replays in this archive were already imported.');
    }
    let grouped: Map<string, DuelsReplayV1[]>;
    try {
      grouped = groupReplaysByMatchViewId(replays);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Grouping failed.');
    }
    const groupKeys = [...grouped.keys()].sort((a, b) => a.localeCompare(b));
    const created: Match[] = [];
    for (const groupKey of groupKeys) {
      if (!isBulkNoMatchViewGroupKey(groupKey)) {
        if (await this.matchesService.hasDuelsBulkMatchViewImport(myPlayerId, groupKey)) {
          continue;
        }
      }
      const group = grouped.get(groupKey);
      if (!group?.length) continue;
      const sorted = [...group].sort((a, b) => a.createdAt - b.createdAt);
      const notes = isBulkNoMatchViewGroupKey(groupKey)
        ? `Imported from duels.ink bulk · game ${sorted[0].gameId} (no matchView, ${sorted.length} game${
            sorted.length === 1 ? '' : 's'
          })`
        : `Imported from duels.ink bulk · matchView ${groupKey} (${sorted.length} game${
            sorted.length === 1 ? '' : 's'
          })`;
      const match = await this.createMatchFromReplays(myPlayerId, myPlayerName, sorted, notes);
      created.push(match);
    }
    if (created.length === 0 && groupKeys.length > 0) {
      throw new BadRequestException(
        'No new matches to import: every grouped match in this archive was already imported (matchView).',
      );
    }
    return created;
  }

  private async assertDuelsReplaysNotYetImported(
    myPlayerId: string,
    replays: DuelsReplayV1[],
  ): Promise<void> {
    const gameIds = replays.map((r) => r.gameId);
    const already = await this.matchesService.findDuelsGameIdsAlreadyImported(myPlayerId, gameIds);
    if (already.size > 0) {
      const list = [...already].sort().join(', ');
      throw new BadRequestException(
        `Replay was already imported (duels gameId: ${list}).`,
      );
    }
  }

  private async requireLinkedPlayer(
    userId: string,
  ): Promise<{ myPlayerId: string; myPlayerName: string }> {
    const myPlayerId = await this.authService.getPlayerId(userId);
    if (!myPlayerId) {
      throw new BadRequestException('No player linked to this account.');
    }
    const myPlayer = await this.playersService.findOne(myPlayerId);
    if (!myPlayer) {
      throw new BadRequestException('Your player was not found.');
    }
    const myPlayerName = (myPlayer.name ?? '').trim();
    return { myPlayerId, myPlayerName };
  }

  private async createMatchFromReplays(
    myPlayerId: string,
    myPlayerName: string,
    replays: DuelsReplayV1[],
    notes: string,
  ): Promise<Match> {
    if (replays.length === 0) {
      throw new BadRequestException('No replays in match group.');
    }
    const opponentName = resolveOpponentNameFromReplays(replays, myPlayerName);
    if (opponentName.toLowerCase() === myPlayerName.toLowerCase()) {
      throw new BadRequestException('Opponent name matches your player.');
    }
    const p2 = await this.playersService.findOrCreateByExactName(opponentName);
    const p2Id = p2._id.toString();
    if (p2Id === myPlayerId) {
      throw new BadRequestException('Opponent resolves to your own player.');
    }
    const sorted = [...replays].sort((a, b) => a.createdAt - b.createdAt);
    const games = sorted.map((r) => duelsReplayToGame(r, myPlayerId, p2Id, myPlayerName));
    const { p1DeckColor, p2DeckColor } = inferMatchDeckColorsFromReplays(replays, myPlayerName);
    return this.matchesService.create({
      p1: myPlayerId,
      p2: p2Id,
      stage: Stage.Online,
      playedAt: new Date(sorted[0].createdAt),
      games,
      notes,
      p1DeckColor,
      p2DeckColor,
    });
  }
}
