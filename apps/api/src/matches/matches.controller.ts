import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Match } from './schemas/lorcana-match.schema';
import { MatchesService } from './matches.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { GlobalMatchStats } from '../analytics/interfaces/analytics-response.interface';
import { FindMatchesQueryDto } from './dto/find-matches-query.dto';
import { StatsQueryDto } from './dto/stats-query.dto';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/paginated-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DEFAULT_MATCHES_PAGE_SIZE } from '../constants';

/** Controller for match CRUD, global stats, and tournament names. */
@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
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

  /** Updates an existing match by id. */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<Match>): Promise<Match | null> {
    return this.matchesService.update(id, dto);
  }

  /** Deletes a match by id. */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ deleted: true }> {
    await this.matchesService.remove(id);
    return { deleted: true };
  }
}
