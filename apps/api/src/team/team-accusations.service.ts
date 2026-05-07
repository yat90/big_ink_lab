import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Player } from '../matches/schemas/player.schema';
import { TeamAccusation } from './schemas/team-accusation.schema';
import { TeamMembersService } from './team-members.service';
import { TeamSettingsService } from './team-settings.service';
import { CreateTeamAccusationDto } from './dto/create-team-accusation.dto';
import { UpdateTeamAccusationDto } from './dto/update-team-accusation.dto';
import type { TeamAccusationView } from './interfaces/team-accusation.interface';
import { AccusationStatus } from './team.constants';

interface PlayerNameLean {
  _id: Types.ObjectId;
  name: string;
}

type AccusationLean = {
  _id: Types.ObjectId;
  accuserPlayer: Types.ObjectId;
  accusedPlayer: Types.ObjectId;
  penaltyId: string;
  penaltyDescription: string;
  penaltyAmount: number;
  details: string;
  status: AccusationStatus;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class TeamAccusationsService {
  constructor(
    @InjectModel(TeamAccusation.name)
    private readonly accusationModel: Model<TeamAccusation>,
    @InjectModel(Player.name)
    private readonly playerModel: Model<Player>,
    private readonly membersService: TeamMembersService,
    private readonly settingsService: TeamSettingsService,
  ) {}

  /** Number of accusations still awaiting a decision (`open`). */
  async countOpen(team: string): Promise<number> {
    return this.accusationModel
      .countDocuments({ team, status: AccusationStatus.Open })
      .exec();
  }

  /** Chronological list for the court room (newest first). */
  async list(team: string): Promise<TeamAccusationView[]> {
    const docs = await this.accusationModel
      .find({ team })
      .sort({ createdAt: -1 })
      .lean<AccusationLean[]>()
      .exec();
    if (docs.length === 0) return [];
    const nameById = await this.loadNamesForDocs(docs);
    return docs.map((d) => this.toView(d, nameById));
  }

  async create(
    team: string,
    dto: CreateTeamAccusationDto,
    accuserPlayerId: string,
  ): Promise<TeamAccusationView> {
    const penaltyId = dto.penaltyId.trim();
    if (!penaltyId) {
      throw new BadRequestException('Penalty id is required.');
    }
    if (accuserPlayerId === dto.accusedPlayerId) {
      throw new BadRequestException('You cannot file an accusation against yourself.');
    }
    await this.membersService.getMember(team, dto.accusedPlayerId);
    const settings = await this.settingsService.get(team);
    const penalty = settings.penalties.find((p) => p.id === penaltyId);
    if (!penalty) {
      throw new BadRequestException('That offense is not in the team penalty catalog.');
    }
    const created = await this.accusationModel.create({
      team,
      accuserPlayer: new Types.ObjectId(accuserPlayerId),
      accusedPlayer: new Types.ObjectId(dto.accusedPlayerId),
      penaltyId,
      penaltyDescription: penalty.description,
      penaltyAmount: penalty.amount,
      details: (dto.details ?? '').trim(),
      status: AccusationStatus.Open,
    });
    const lean = await this.accusationModel
      .findById(created._id)
      .lean<AccusationLean | null>()
      .exec();
    if (!lean) {
      throw new NotFoundException('Accusation not found after create.');
    }
    const nameById = await this.loadNamesForPlayerIds([
      accuserPlayerId,
      dto.accusedPlayerId,
    ]);
    return this.toView(lean, nameById);
  }

  async updateStatus(
    team: string,
    accusationId: string,
    dto: UpdateTeamAccusationDto,
  ): Promise<TeamAccusationView> {
    if (!Types.ObjectId.isValid(accusationId)) {
      throw new BadRequestException('Invalid accusation id.');
    }
    const oid = new Types.ObjectId(accusationId);
    const existing = await this.accusationModel
      .findOne({ team, _id: oid })
      .lean<AccusationLean | null>()
      .exec();
    if (!existing) {
      throw new NotFoundException('Accusation not found.');
    }
    if (dto.status === AccusationStatus.Open && existing.status === AccusationStatus.Open) {
      throw new BadRequestException('Accusation is already open.');
    }
    const updated = await this.accusationModel
      .findOneAndUpdate({ team, _id: oid }, { $set: { status: dto.status } }, { new: true })
      .lean<AccusationLean | null>()
      .exec();
    if (!updated) {
      throw new NotFoundException('Accusation not found.');
    }
    const nameById = await this.loadNamesForDocs([updated]);
    return this.toView(updated, nameById);
  }

  /** Accuser may delete their own filing only while it is still open (withdraw before a decision). */
  async deleteByAccuser(
    team: string,
    accusationId: string,
    requesterPlayerId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(accusationId)) {
      throw new BadRequestException('Invalid accusation id.');
    }
    const oid = new Types.ObjectId(accusationId);
    const existing = await this.accusationModel
      .findOne({ team, _id: oid })
      .lean<AccusationLean | null>()
      .exec();
    if (!existing) {
      throw new NotFoundException('Accusation not found.');
    }
    if (String(existing.accuserPlayer) !== requesterPlayerId) {
      throw new ForbiddenException('Only the person who filed this accusation can delete it.');
    }
    if (existing.status !== AccusationStatus.Open) {
      throw new BadRequestException('Only open accusations can be withdrawn.');
    }
    const result = await this.accusationModel.deleteOne({ team, _id: oid }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Accusation not found.');
    }
  }

  private async loadNamesForPlayerIds(playerIds: string[]): Promise<Map<string, string>> {
    const oidList = [...new Set(playerIds)].filter((id) => Types.ObjectId.isValid(id));
    const players = await this.playerModel
      .find({ _id: { $in: oidList.map((id) => new Types.ObjectId(id)) } })
      .select('name')
      .lean<PlayerNameLean[]>()
      .exec();
    return new Map(players.map((p) => [String(p._id), p.name]));
  }

  private async loadNamesForDocs(docs: AccusationLean[]): Promise<Map<string, string>> {
    const ids: string[] = [];
    for (const d of docs) {
      ids.push(String(d.accuserPlayer), String(d.accusedPlayer));
    }
    return this.loadNamesForPlayerIds(ids);
  }

  private toView(d: AccusationLean, nameById: Map<string, string>): TeamAccusationView {
    const accuserId = String(d.accuserPlayer);
    const accusedId = String(d.accusedPlayer);
    return {
      id: String(d._id),
      status: d.status,
      accuser: {
        playerId: accuserId,
        name: nameById.get(accuserId) ?? '—',
      },
      accused: {
        playerId: accusedId,
        name: nameById.get(accusedId) ?? '—',
      },
      penaltyId: d.penaltyId,
      penaltyDescription: d.penaltyDescription,
      penaltyAmount: d.penaltyAmount,
      details: d.details,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }
}
