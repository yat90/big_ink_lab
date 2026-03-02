import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Match } from './schemas/lorcana-match.schema';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  async findAll(): Promise<Match[]> {
    return this.matchesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: Partial<Match>) {
    return this.matchesService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<Match>) {
    return this.matchesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.matchesService.remove(id);
    return { deleted: true };
  }
}
