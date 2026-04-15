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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DEFAULT_PAGE_SIZE } from '../constants';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/paginated-response.dto';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { FindTournamentsQueryDto } from './dto/find-tournaments-query.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import {
  TournamentsService,
  type TournamentDashboardRow,
  type TournamentListRow,
} from './tournaments.service';

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  async create(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(dto);
  }

  /** Last 2 tournaments before `day` and next 2 on or after (UTC midnight of `day`). */
  @Get('dashboard/window')
  async dashboardWindow(
    @Query('day') day?: string,
  ): Promise<{ past: TournamentDashboardRow[]; upcoming: TournamentDashboardRow[] }> {
    const d =
      day?.trim() ||
      new Date().toISOString().slice(0, 10);
    return this.tournamentsService.findDashboardWindow(d);
  }

  @Get()
  async findAll(@Query() query: FindTournamentsQueryDto): Promise<PaginatedResponse<TournamentListRow>> {
    const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(query.limit ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    );
    const { data, total } = await this.tournamentsService.findAllPage(page, limit, {
      name: query.name?.trim(),
      meta: query.meta?.trim(),
      location: query.location?.trim(),
      fromDate: query.fromDate?.trim(),
      toDate: query.toDate?.trim(),
    });
    return createPaginatedResponse(data, total, page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TournamentListRow> {
    const row = await this.tournamentsService.findOneWithStats(id);
    if (!row) throw new NotFoundException('Tournament not found');
    return row;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTournamentDto) {
    const updated = await this.tournamentsService.update(id, dto);
    if (!updated) throw new NotFoundException('Tournament not found');
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ deleted: true }> {
    const ok = await this.tournamentsService.remove(id);
    if (!ok) throw new NotFoundException('Tournament not found');
    return { deleted: true };
  }
}
