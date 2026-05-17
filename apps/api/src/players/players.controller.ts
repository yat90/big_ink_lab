import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Player } from '../matches/schemas/player.schema';
import { PlayersService } from './players.service';
import type { MergePlayerResult } from './players.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { PlayerStatsDto, DeckUsed } from '../analytics/interfaces/analytics-response.interface';
import { FindPlayersQueryDto } from './dto/find-players-query.dto';
import { MergePlayerDto } from './dto/merge-player.dto';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/paginated-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { DEFAULT_PAGE_SIZE } from '../constants';

/** Response shape for GET /players/:id (player with stats and decks used). */
export interface PlayerWithStatsResponse {
  _id: unknown;
  name?: string;
  team?: string;
  isGuest?: boolean;
  /** True when a login account references this player — guest flag cannot be enabled. */
  hasLinkedAccount: boolean;
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
      query.includeGuests === true,
      query.guestsOnly === true,
    );
    return createPaginatedResponse(data, total, page, limit);
  }

  /** Returns distinct team names for filters (no pagination). */
  @Get('teams')
  async getTeamNames(
    @Query('includeGuests', new DefaultValuePipe(false), ParseBoolPipe) includeGuests: boolean,
  ): Promise<{ teams: string[] }> {
    const teams = await this.playersService.findDistinctTeamNames(includeGuests);
    return { teams };
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
    const hasLinkedAccount = await this.playersService.isPlayerLinkedToUser(id);
    return {
      ...player.toObject(),
      stats,
      decksUsed,
      hasLinkedAccount,
    } as PlayerWithStatsResponse;
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
    @Body() dto: Partial<Pick<Player, 'name' | 'team' | 'isGuest'>>,
  ): Promise<Player> {
    const player = await this.playersService.update(id, dto);
    if (!player) throw new NotFoundException('Player not found');
    return player;
  }

  /** Merges source player into target player. Requires admin role. */
  @Post('merge')
  @Roles(Role.Admin)
  @UseGuards(RolesGuard)
  async merge(@Body() dto: MergePlayerDto): Promise<MergePlayerResult> {
    return this.playersService.mergePlayer(dto.sourceId, dto.targetId);
  }
}
