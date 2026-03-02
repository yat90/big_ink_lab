import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
    return this.playersService.findOne(id);
  }

  @Post()
  async create(@Body() dto: Partial<Player>) {
    return this.playersService.create(dto);
  }
}
