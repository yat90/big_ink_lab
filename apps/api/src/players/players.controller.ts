import { Body, Controller, Get, Param, Patch, Post, Query, NotFoundException, UseGuards } from '@nestjs/common';
import { Player } from '../matches/schemas/player.schema';
import { PlayersService } from './players.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { PlayerStatsDto, DeckUsed } from '../analytics/interfaces/analytics-response.interface';
import { FindPlayersQueryDto } from './dto/find-players-query.dto';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/paginated-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DEFAULT_PAGE_SIZE } from '../constants';

/** Response shape for GET /players/:id (player with stats and decks used). */
export interface PlayerWithStatsResponse {
  _id: unknown;
  name?: string;
  team?: string;
  stats: PlayerStatsDto;
  decksUsed: DeckUsed[];
}

/** Controller for player CRUD and player stats. */
@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /** Returns paginated list of players with optional filters. */
  @Get()
  async findAll(@Query() query: FindPlayersQueryDto): Promise<PaginatedResponse<Player>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const { data, total } = await this.playersService.findAll(
      page,
      limit,
      query.name,
      query.team,
    );
    return createPaginatedResponse(data, total, page, limit);
  }

  /** Returns a single player by id with stats and decks used. */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('deckId') deckId?: string,
    @Query('matrixMode') matrixMode?: 'matches' | 'games',
  ): Promise<PlayerWithStatsResponse> {
    const player = await this.playersService.findOne(id);
    if (!player) throw new NotFoundException('Player not found');
    const { stats, decksUsed } = await this.analyticsService.getPlayerStats(id, {
      deckId,
      matrixMode: matrixMode === 'games' ? 'games' : 'matches',
    });
    return { ...player.toObject(), stats, decksUsed } as PlayerWithStatsResponse;
  }

  /** Creates a new player. */
  @Post()
  async create(@Body() dto: Partial<Player>): Promise<Player> {
    return this.playersService.create(dto);
  }

  /** Updates an existing player by id. */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<Pick<Player, 'name' | 'team'>>,
  ): Promise<Player> {
    const player = await this.playersService.update(id, dto);
    if (!player) throw new NotFoundException('Player not found');
    return player;
  }
}
