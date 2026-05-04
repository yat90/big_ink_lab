import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { Role } from '../auth/roles.enum';
import { Roles } from '../auth/roles.decorator';
import { TeamContextService } from './team-context.service';
import { TeamAccusationsService } from './team-accusations.service';
import { CreateTeamAccusationDto } from './dto/create-team-accusation.dto';
import { UpdateTeamAccusationDto } from './dto/update-team-accusation.dto';
import type { TeamAccusationView } from './interfaces/team-accusation.interface';

/** Court room: members file accusations against teammates using the penalty catalog; admins settle status. */
@Controller('team/accusations')
export class TeamAccusationsController {
  constructor(
    private readonly contextService: TeamContextService,
    private readonly accusationsService: TeamAccusationsService,
  ) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload): Promise<{ data: TeamAccusationView[] }> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    const data = await this.accusationsService.list(ctx.team);
    return { data };
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTeamAccusationDto,
  ): Promise<TeamAccusationView> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    if (!ctx.playerId) {
      throw new BadRequestException('Your account is not linked to a player profile.');
    }
    return this.accusationsService.create(ctx.team, dto, ctx.playerId);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTeamAccusationDto,
  ): Promise<TeamAccusationView> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    return this.accusationsService.updateStatus(ctx.team, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    if (!ctx.playerId) {
      throw new BadRequestException('Your account is not linked to a player profile.');
    }
    await this.accusationsService.deleteByAccuser(ctx.team, id, ctx.playerId);
  }
}
