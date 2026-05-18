import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Player } from '../matches/schemas/player.schema';
import { User } from '../auth/schemas/user.schema';
import { Role } from '../auth/roles.enum';
import { MemberProfile } from './schemas/member-profile.schema';
import { TeamTransaction } from './schemas/team-transaction.schema';
import { UpsertMemberDto } from './dto/upsert-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import {
  DEFAULT_MEMBER_STATUS,
  DUES_PAYING_STATUSES,
  MemberStatus,
  TransactionType,
} from './team.constants';
import { TeamMember } from './interfaces/team-member.interface';
import { AuthService } from '../auth/auth.service';
import { TeamSettingsService } from './team-settings.service';

interface PlayerLean {
  _id: Types.ObjectId;
  name: string;
  team?: string;
}

interface UserLean {
  _id: Types.ObjectId;
  email: string;
  role: Role;
  player?: Types.ObjectId;
}

interface MemberProfileLean {
  player: Types.ObjectId;
  joinedAt?: Date;
  status?: MemberStatus;
  notes?: string;
}

@Injectable()
export class TeamMembersService {
  constructor(
    @InjectModel(Player.name) private readonly playerModel: Model<Player>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(MemberProfile.name) private readonly memberProfileModel: Model<MemberProfile>,
    @InjectModel(TeamTransaction.name)
    private readonly transactionModel: Model<TeamTransaction>,
    private readonly settingsService: TeamSettingsService,
    private readonly authService: AuthService,
  ) {}

  /** Admin: issue a new temporary login password for a member with a linked account. */
  resetMemberPassword(
    team: string,
    playerId: string,
  ): Promise<{ temporaryPassword: string }> {
    return this.authService.adminResetPasswordForTeamMember(team, playerId);
  }

  /** List of members for the given team. Always sourced from Players where `team === team`. */
  async listForTeam(team: string): Promise<TeamMember[]> {
    const players = await this.playerModel
      .find({ team, isGuest: { $ne: true } })
      .sort({ name: 1 })
      .lean<PlayerLean[]>()
      .exec();
    if (players.length === 0) return [];
    const playerIds = players.map((p) => p._id);
    const [profiles, accounts, contributions, penalties, monthlyDues] = await Promise.all([
      this.memberProfileModel
        .find({ player: { $in: playerIds } })
        .lean<MemberProfileLean[]>()
        .exec(),
      this.userModel
        .find({ player: { $in: playerIds } })
        .select('_id email role player')
        .lean<UserLean[]>()
        .exec(),
      this.aggregateContributionsByPlayer(team, playerIds),
      this.aggregatePenaltiesByPlayer(team, playerIds),
      this.settingsService.getMonthlyDues(team),
    ]);
    const profileByPlayer = new Map(profiles.map((p) => [String(p.player), p]));
    const accountByPlayer = new Map(accounts.map((a) => [String(a.player), a]));
    return players.map((player) =>
      this.buildMember(
        player,
        profileByPlayer.get(String(player._id)),
        accountByPlayer.get(String(player._id)),
        contributions.get(String(player._id)) ?? 0,
        penalties.get(String(player._id)) ?? 0,
        monthlyDues,
      ),
    );
  }

  async getMember(team: string, playerId: string): Promise<TeamMember> {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new BadRequestException('Invalid player id.');
    }
    const player = await this.playerModel.findById(playerId).lean<PlayerLean>().exec();
    if (!player) throw new NotFoundException('Player not found.');
    if ((player.team ?? '').trim() !== team) {
      throw new NotFoundException('Player is not part of your team.');
    }
    const [profile, account, total, penaltiesTotal, monthlyDues] = await Promise.all([
      this.memberProfileModel
        .findOne({ player: player._id })
        .lean<MemberProfileLean>()
        .exec(),
      this.userModel
        .findOne({ player: player._id })
        .select('_id email role player')
        .lean<UserLean>()
        .exec(),
      this.sumContributionsForPlayer(team, player._id),
      this.sumPenaltiesForPlayer(team, player._id),
      this.settingsService.getMonthlyDues(team),
    ]);
    return this.buildMember(
      player,
      profile ?? undefined,
      account ?? undefined,
      total,
      penaltiesTotal,
      monthlyDues,
    );
  }

  /** Promote an existing roster player into the team — sets team and creates the profile. */
  async addMember(team: string, dto: UpsertMemberDto): Promise<TeamMember> {
    if (!Types.ObjectId.isValid(dto.playerId)) {
      throw new BadRequestException('Invalid player id.');
    }
    const player = await this.playerModel.findById(dto.playerId).exec();
    if (!player) throw new NotFoundException('Player not found.');
    if (player.isGuest) {
      throw new BadRequestException('Guest players cannot be added to a team.');
    }
    const targetTeam = (player.team ?? '').trim();
    if (targetTeam && targetTeam !== team) {
      throw new BadRequestException(
        `Player already belongs to another team ("${targetTeam}"). Move them in their player profile first.`,
      );
    }
    if (targetTeam !== team) {
      player.team = team;
      await player.save();
    }
    await this.memberProfileModel.updateOne(
      { player: player._id },
      {
        $setOnInsert: {
          player: player._id,
          joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : new Date(),
          status: dto.status ?? DEFAULT_MEMBER_STATUS,
        },
        $set: {
          notes: (dto.notes ?? '').trim(),
        },
      },
      { upsert: true },
    );
    return this.getMember(team, String(player._id));
  }

  async updateMember(
    team: string,
    playerId: string,
    dto: UpdateMemberDto,
    actorUserId: string,
  ): Promise<TeamMember> {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new BadRequestException('Invalid player id.');
    }
    const player = await this.playerModel.findById(playerId).lean<PlayerLean>().exec();
    if (!player) throw new NotFoundException('Player not found.');
    if ((player.team ?? '').trim() !== team) {
      throw new NotFoundException('Player is not part of your team.');
    }
    const profileSet: Record<string, unknown> = {};
    if (dto.joinedAt !== undefined) profileSet.joinedAt = new Date(dto.joinedAt);
    if (dto.status !== undefined) profileSet.status = dto.status;
    if (dto.notes !== undefined) profileSet.notes = dto.notes.trim();
    if (Object.keys(profileSet).length > 0) {
      await this.memberProfileModel.updateOne(
        { player: player._id },
        { $set: profileSet, $setOnInsert: { player: player._id } },
        { upsert: true },
      );
    }
    if (dto.role !== undefined) {
      await this.applyRoleChange(player._id, dto.role, actorUserId);
    }
    return this.getMember(team, String(player._id));
  }

  /** Removes the team link (sets team='') and deletes the profile. Contributions stay. */
  async removeMember(team: string, playerId: string, actorUserId: string): Promise<void> {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new BadRequestException('Invalid player id.');
    }
    const player = await this.playerModel.findById(playerId).exec();
    if (!player) throw new NotFoundException('Player not found.');
    if ((player.team ?? '').trim() !== team) {
      throw new NotFoundException('Player is not part of your team.');
    }
    const account = await this.userModel
      .findOne({ player: player._id })
      .select('_id role')
      .lean<UserLean>()
      .exec();
    if (account && String(account._id) === actorUserId) {
      throw new BadRequestException('You cannot remove yourself from the team.');
    }
    player.team = '';
    await player.save();
    await this.memberProfileModel.deleteOne({ player: player._id }).exec();
  }

  private async applyRoleChange(
    playerId: Types.ObjectId,
    role: Role,
    actorUserId: string,
  ): Promise<void> {
    const account = await this.userModel
      .findOne({ player: playerId })
      .select('_id role')
      .exec();
    if (!account) {
      throw new BadRequestException('Cannot change role: player has no linked user account.');
    }
    if (String(account._id) === actorUserId && role !== Role.Admin) {
      throw new ForbiddenException('You cannot demote yourself from admin.');
    }
    if (account.role === role) return;
    account.role = role;
    await account.save();
  }

  private buildMember(
    player: PlayerLean,
    profile: MemberProfileLean | undefined,
    account: UserLean | undefined,
    contributedTotal: number,
    penaltiesTotal: number,
    monthlyDues: number,
  ): TeamMember {
    const joinedAt = profile?.joinedAt ?? null;
    const status = profile?.status ?? DEFAULT_MEMBER_STATUS;
    const months = this.monthsBetween(joinedAt, new Date());
    // Padawan and inactive members do not accumulate outstanding dues.
    const expected = DUES_PAYING_STATUSES.includes(status) ? monthlyDues * months : 0;
    const outstanding = Math.max(0, expected - contributedTotal);
    return {
      playerId: String(player._id),
      name: player.name,
      team: (player.team ?? '').trim(),
      email: account?.email ?? null,
      role: account?.role ?? null,
      hasAccount: !!account,
      joinedAt: joinedAt ? joinedAt.toISOString() : null,
      status,
      notes: profile?.notes ?? '',
      contributedTotal,
      penaltiesTotal,
      outstanding,
    };
  }

  /**
   * Number of calendar months from join through today, inclusive.
   * The month of `joinedAt` counts as the first dues month (same month → 1).
   */
  private monthsBetween(start: Date | null, end: Date): number {
    if (!start) return 0;
    if (start.getTime() > end.getTime()) return 0;
    const inclusiveMonths =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1;
    return inclusiveMonths;
  }

  private async aggregateContributionsByPlayer(
    team: string,
    playerIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    if (playerIds.length === 0) return new Map();
    const rows = await this.transactionModel
      .aggregate<{ _id: Types.ObjectId; total: number }>([
        {
          $match: {
            team,
            type: TransactionType.Contribution,
            player: { $in: playerIds },
          },
        },
        { $group: { _id: '$player', total: { $sum: '$amount' } } },
      ])
      .exec();
    return new Map(rows.map((r) => [String(r._id), r.total]));
  }

  private async sumContributionsForPlayer(
    team: string,
    playerId: Types.ObjectId,
  ): Promise<number> {
    const rows = await this.transactionModel
      .aggregate<{ total: number }>([
        {
          $match: { team, type: TransactionType.Contribution, player: playerId },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();
    return rows[0]?.total ?? 0;
  }

  private async aggregatePenaltiesByPlayer(
    team: string,
    playerIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    if (playerIds.length === 0) return new Map();
    const rows = await this.transactionModel
      .aggregate<{ _id: Types.ObjectId; total: number }>([
        {
          $match: {
            team,
            type: TransactionType.PenaltyFine,
            player: { $in: playerIds },
          },
        },
        { $group: { _id: '$player', total: { $sum: '$amount' } } },
      ])
      .exec();
    return new Map(rows.map((r) => [String(r._id), r.total]));
  }

  private async sumPenaltiesForPlayer(
    team: string,
    playerId: Types.ObjectId,
  ): Promise<number> {
    const rows = await this.transactionModel
      .aggregate<{ total: number }>([
        {
          $match: { team, type: TransactionType.PenaltyFine, player: playerId },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();
    return rows[0]?.total ?? 0;
  }
}
