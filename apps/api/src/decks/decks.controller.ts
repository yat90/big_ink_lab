import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  NotFoundException,
} from '@nestjs/common';
import { Deck } from './schemas/deck.schema';
import { DecksService, type DeckStats } from './decks.service';

@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Get()
  async findAll(): Promise<Deck[]> {
    return this.decksService.findAll();
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
