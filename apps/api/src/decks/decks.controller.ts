import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/paginated-response.dto';
import { DEFAULT_PAGE_SIZE } from '../constants';
import { FindDecksQueryDto } from './dto/find-decks-query.dto';
import { Deck } from './schemas/deck.schema';
import { DecksService } from './decks.service';
import type { DeckStats } from './deck-stats.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** Controller for deck CRUD and deck stats. */
@Controller('decks')
@UseGuards(JwtAuthGuard)
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  /** Returns paginated list of decks with optional filters. */
  @Get()
  async findAll(@Query() query: FindDecksQueryDto): Promise<PaginatedResponse<Deck>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const { data, total } = await this.decksService.findAll(
      { color: query.color, player: query.player, name: query.name },
      page,
      limit,
    );
    return createPaginatedResponse(data, total, page, limit);
  }

  /** Returns stats for a deck by id. */
  @Get(':id/stats')
  async getStats(@Param('id') id: string): Promise<DeckStats> {
    const deck = await this.decksService.findOne(id);
    if (!deck) throw new NotFoundException('Deck not found');
    return this.decksService.getDeckStats(id);
  }

  /** Returns a single deck by id. */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Deck> {
    const deck = await this.decksService.findOne(id);
    if (!deck) throw new NotFoundException('Deck not found');
    return deck;
  }

  /** Creates a new deck from deck list and optional metadata. */
  @Post()
  async create(@Body() dto: Partial<Deck>): Promise<Deck> {
    return this.decksService.create(dto);
  }

  /** Updates an existing deck by id. */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<Deck>): Promise<Deck> {
    const deck = await this.decksService.update(id, dto);
    if (!deck) throw new NotFoundException('Deck not found');
    return deck;
  }

  /** Deletes a deck by id. */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ deleted: true }> {
    const deleted = await this.decksService.remove(id);
    if (!deleted) throw new NotFoundException('Deck not found');
    return { deleted: true };
  }
}
