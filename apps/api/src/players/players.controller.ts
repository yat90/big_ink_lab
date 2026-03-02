import { Body, Controller, Get, Param, Patch, Post, NotFoundException } from '@nestjs/common';
import { Player } from '../matches/schemas/player.schema';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  async findAll(): Promise<Player[]> {
    return this.playersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const player = await this.playersService.findOne(id);
    if (!player) throw new NotFoundException('Player not found');
    const stats = await this.playersService.getStats(id);
    return { ...player.toObject(), stats };
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
