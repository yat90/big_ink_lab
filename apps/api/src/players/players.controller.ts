import { Body, Controller, Get, Param, Patch, Post, Query, NotFoundException } from '@nestjs/common';
import { Player } from '../matches/schemas/player.schema';
import { PlayersService } from './players.service';
import { FindPlayersQueryDto } from './dto/find-players-query.dto';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/paginated-response.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  async findAll(@Query() query: FindPlayersQueryDto): Promise<PaginatedResponse<Player>> {
    const { data, total } = await this.playersService.findAll(query.page ?? 1, query.limit ?? 20);
    return createPaginatedResponse(data, total, query.page ?? 1, query.limit ?? 20);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('deckId') deckId?: string,
    @Query('matrixMode') matrixMode?: 'matches' | 'games'
  ) {
    const player = await this.playersService.findOne(id);
    if (!player) throw new NotFoundException('Player not found');
    const [stats, decksUsed] = await Promise.all([
      this.playersService.getStats(id, deckId, matrixMode === 'games' ? 'games' : 'matches'),
      this.playersService.getDecksUsed(id),
    ]);
    return { ...player.toObject(), stats, decksUsed };
  }

  @Post()
  async create(@Body() dto: Partial<Player>) {
    return this.playersService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<Pick<Player, 'name' | 'team'>>) {
    const player = await this.playersService.update(id, dto);
    if (!player) throw new NotFoundException('Player not found');
    return player;
  }
}
