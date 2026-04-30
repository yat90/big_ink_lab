import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService, type DashboardSummaryDto } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** Single payload for the home dashboard: counts, 5 recent matches, tournament window. */
  @Get('summary')
  async summary(@Query('day') day?: string): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary(
      day?.trim() || new Date().toISOString().slice(0, 10),
    );
  }
}
