import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { Role } from '../auth/roles.enum';
import { Roles } from '../auth/roles.decorator';
import { TeamContextService } from './team-context.service';
import { TeamMembersService } from './team-members.service';
import { TeamTransactionsService } from './team-transactions.service';
import { TeamSettingsService, TeamSettingsView } from './team-settings.service';
import { TeamOverview } from './interfaces/team-overview.interface';
import { TeamBalance } from './interfaces/team-balance.interface';
import { UpdateTeamSettingsDto } from './dto/update-team-settings.dto';
import { TeamInternalRankingService } from './team-internal-ranking.service';

/** Read-only overview endpoints + team-wide settings. */
@Controller('team')
export class TeamController {
  constructor(
    private readonly contextService: TeamContextService,
    private readonly membersService: TeamMembersService,
    private readonly transactionsService: TeamTransactionsService,
    private readonly settingsService: TeamSettingsService,
    private readonly internalRankingService: TeamInternalRankingService,
  ) {}

  /** Bootstrap payload: team name, current user's role, balance. */
  @Get('me')
  async me(@CurrentUser() user: JwtPayload): Promise<TeamOverview> {
    const ctx = await this.contextService.getOptionalContext(user.sub);
    if (!ctx.team) {
      return {
        team: '',
        role: ctx.role,
        playerId: ctx.playerId,
        hasTeam: false,
        balance: null,
        internalRanking: null,
        internalHeadToHead: null,
      };
    }
    const [balance, internalStandings] = await Promise.all([
      this.computeBalance(ctx.team),
      this.internalRankingService.computeInternalStandings(ctx.team),
    ]);
    return {
      team: ctx.team,
      role: ctx.role,
      playerId: ctx.playerId,
      hasTeam: true,
      balance,
      internalRanking: internalStandings.ranking,
      internalHeadToHead: internalStandings.headToHead,
    };
  }

  @Get('balance')
  async balance(@CurrentUser() user: JwtPayload): Promise<TeamBalance> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    return this.computeBalance(ctx.team);
  }

  /** Team-wide settings (e.g. monthly dues per member). Visible to every team member. */
  @Get('settings')
  async getSettings(@CurrentUser() user: JwtPayload): Promise<TeamSettingsView> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    return this.settingsService.get(ctx.team);
  }

  @Patch('settings')
  @Roles(Role.Admin)
  async updateSettings(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTeamSettingsDto,
  ): Promise<TeamSettingsView> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    return this.settingsService.update(ctx.team, dto);
  }

  private async computeBalance(team: string): Promise<TeamBalance> {
    const [members, monthlyDues] = await Promise.all([
      this.membersService.listForTeam(team),
      this.settingsService.getMonthlyDues(team),
    ]);
    const outstandingTotal = members.reduce((sum, m) => sum + m.outstanding, 0);
    return this.transactionsService.getBalance(
      team,
      members.length,
      outstandingTotal,
      monthlyDues,
    );
  }
}
