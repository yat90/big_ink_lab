import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { Role } from '../auth/roles.enum';
import { Roles } from '../auth/roles.decorator';
import { TeamContextService } from './team-context.service';
import { TeamMembersService } from './team-members.service';
import { UpsertMemberDto } from './dto/upsert-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TeamMember } from './interfaces/team-member.interface';

@Controller('team/members')
export class TeamMembersController {
  constructor(
    private readonly contextService: TeamContextService,
    private readonly membersService: TeamMembersService,
  ) {}

  /** All members of the current user's team. Visible to every team member. */
  @Get()
  async list(@CurrentUser() user: JwtPayload): Promise<{ data: TeamMember[] }> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    const data = await this.membersService.listForTeam(ctx.team);
    return { data };
  }

  @Get(':playerId')
  async get(
    @CurrentUser() user: JwtPayload,
    @Param('playerId') playerId: string,
  ): Promise<TeamMember> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    return this.membersService.getMember(ctx.team, playerId);
  }

  @Post()
  @Roles(Role.Admin)
  async add(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertMemberDto,
  ): Promise<TeamMember> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    return this.membersService.addMember(ctx.team, dto);
  }

  @Patch(':playerId')
  @Roles(Role.Admin)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('playerId') playerId: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<TeamMember> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    return this.membersService.updateMember(ctx.team, playerId, dto, ctx.userId);
  }

  @Delete(':playerId')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('playerId') playerId: string,
  ): Promise<void> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    await this.membersService.removeMember(ctx.team, playerId, ctx.userId);
  }
}
