import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { Deck } from './schemas/deck.schema';
import { DecksService, type DeckStats } from './decks.service';
import { FindDecksQueryDto } from './dto/find-decks-query.dto';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/paginated-response.dto';

@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Get()
  async findAll(@Query() query: FindDecksQueryDto): Promise<PaginatedResponse<Deck>> {
    const { data, total } = await this.decksService.findAll(
      { color: query.color, player: query.player, name: query.name },
      query.page ?? 1,
      query.limit ?? 20
    );
    return createPaginatedResponse(data, total, query.page ?? 1, query.limit ?? 20);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string): Promise<DeckStats> {
    const deck = await this.decksService.findOne(id);
    if (!deck) throw new NotFoundException('Deck not found');
    return this.decksService.getDeckStats(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const deck = await this.decksService.findOne(id);
    if (!deck) throw new NotFoundException('Deck not found');
    return deck;
  }

  @Post()
  async create(@Body() dto: Partial<Deck>) {
    return this.decksService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<Deck>) {
    const deck = await this.decksService.update(id, dto);
    if (!deck) throw new NotFoundException('Deck not found');
    return deck;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.decksService.remove(id);
    if (!deleted) throw new NotFoundException('Deck not found');
    return { deleted: true };
  }
}
