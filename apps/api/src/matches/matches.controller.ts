import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Match } from './schemas/lorcana-match.schema';
import { MatchesService } from './matches.service';
import { AuthService } from '../auth/auth.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { GlobalMatchStats } from '../analytics/interfaces/analytics-response.interface';
import { FindMatchesQueryDto } from './dto/find-matches-query.dto';
import { TournamentBulkResultsDto } from './dto/tournament-bulk-results.dto';
import { StatsQueryDto } from './dto/stats-query.dto';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/paginated-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { DEFAULT_MATCHES_PAGE_SIZE } from '../constants';

function toPlayerId(p: unknown): string | null {
  if (p == null) return null;
  if (typeof p === 'string') return p;
  if (typeof p === 'object' && p !== null && '_id' in p) {
    const id = (p as { _id: unknown })._id;
    return id != null ? String(id) : null;
  }
  return String(p);
}

/** Controller for match CRUD, global stats, and tournament names. */
@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly authService: AuthService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /** Returns paginated list of matches with optional filters. */
  @Get()
  async findAll(@Query() query: FindMatchesQueryDto): Promise<PaginatedResponse<Match>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_MATCHES_PAGE_SIZE;
    const { data, total } = await this.matchesService.findAll(query);
    return createPaginatedResponse(data, total, page, limit);
  }

  /** Returns global match stats with optional stage and tournament filters. */
  @Get('stats')
  async getStats(@Query() query: StatsQueryDto): Promise<GlobalMatchStats> {
    const stages = Array.isArray(query.stage) ? query.stage : query.stage ? [query.stage] : undefined;
    const tournamentName = query.tournamentName?.trim() || undefined;
    const matrixMode = query.matrixMode === 'games' ? 'games' : 'matches';
    return this.analyticsService.getGlobalMatchStats(stages, tournamentName, matrixMode);
  }

  /** Aggregated list of tournaments (name, match count, last played). */
  @Get('tournaments/summary')
  async getTournamentSummaries(): Promise<
    Array<{ tournamentName: string; matchCount: number; latestPlayedAt: Date | null }>
  > {
    return this.matchesService.getTournamentSummaries();
  }

  /** Returns distinct tournament names for Tournament stage. */
  @Get('tournaments')
  async getTournamentNames(): Promise<{ tournamentNames: string[] }> {
    return this.matchesService.getDistinctTournamentNames();
  }

  /** Returns a single match by id. */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Match | null> {
    return this.matchesService.findOne(id);
  }

  /** Creates a new match. */
  @Post()
  async create(@Body() dto: Partial<Match>): Promise<Match> {
    return this.matchesService.create(dto);
  }

  /** Creates many tournament matches (one per round) with games and notes. */
  @Post('tournaments/bulk-results')
  async createTournamentBulkResults(
    @Body() dto: TournamentBulkResultsDto
  ): Promise<{ created: Match[]; failed: Array<{ round: number; message: string }> }> {
    return this.matchesService.createTournamentBulkResults(dto);
  }

  /** Updates an existing match by id. Only participants (p1 or p2) may update. */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<Match>,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<Match | null> {
    await this.ensureUserIsParticipant(id, req.user?.sub);
    return this.matchesService.update(id, dto);
  }

  /** Deletes a match by id. Only participants (p1 or p2) may delete. */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<{ deleted: true }> {
    await this.ensureUserIsParticipant(id, req.user?.sub);
    await this.matchesService.remove(id);
    return { deleted: true };
  }

  /** Throws ForbiddenException if the current user is not p1 or p2 of the match. */
  private async ensureUserIsParticipant(matchId: string, userId: string | undefined): Promise<void> {
    if (!userId) {
      throw new ForbiddenException('Only match participants can edit this match.');
    }
    const myPlayerId = await this.authService.getPlayerId(userId);
    if (!myPlayerId) {
      throw new ForbiddenException('Only match participants can edit this match.');
    }
    const match = await this.matchesService.findOne(matchId);
    if (!match) {
      throw new ForbiddenException('Only match participants can edit this match.');
    }
    const p1Id = toPlayerId(match.p1);
    const p2Id = toPlayerId(match.p2);
    if (myPlayerId !== p1Id && myPlayerId !== p2Id) {
      throw new ForbiddenException('Only match participants can edit this match.');
    }
  }
}
