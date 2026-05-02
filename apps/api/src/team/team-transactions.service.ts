import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Player } from '../matches/schemas/player.schema';
import { TeamTransaction } from './schemas/team-transaction.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FindTransactionsQueryDto } from './dto/find-transactions-query.dto';
import { TransactionType } from './team.constants';
import { TeamBalance } from './interfaces/team-balance.interface';
import { DEFAULT_PAGE_SIZE } from '../constants';

interface TransactionLean {
  _id: Types.ObjectId;
  team: string;
  type: TransactionType;
  amount: number;
  description: string;
  occurredAt: Date;
  player?: Types.ObjectId | { _id: Types.ObjectId; name: string };
  createdBy?: Types.ObjectId;
  createdAt?: Date;
}

export interface ListTransactionsResult {
  data: TransactionLean[];
  total: number;
}

@Injectable()
export class TeamTransactionsService {
  constructor(
    @InjectModel(TeamTransaction.name)
    private readonly transactionModel: Model<TeamTransaction>,
    @InjectModel(Player.name) private readonly playerModel: Model<Player>,
  ) {}

  async list(
    team: string,
    query: FindTransactionsQueryDto,
  ): Promise<ListTransactionsResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const filter: Record<string, unknown> = { team };
    if (query.type) filter.type = query.type;
    if (query.playerId) {
      if (!Types.ObjectId.isValid(query.playerId)) {
        throw new BadRequestException('Invalid player id.');
      }
      filter.player = new Types.ObjectId(query.playerId);
    }
    const skip = (page - 1) * limit;
    const cursor = this.transactionModel
      .find(filter)
      .sort({ occurredAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'player', select: 'name' });
    const [data, total] = await Promise.all([
      cursor.lean<TransactionLean[]>().exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async listByPlayer(
    team: string,
    playerId: string,
    page: number,
    limit: number,
  ): Promise<ListTransactionsResult> {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new BadRequestException('Invalid player id.');
    }
    const filter = {
      team,
      player: new Types.ObjectId(playerId),
      type: TransactionType.Contribution,
    };
    const [data, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ occurredAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<TransactionLean[]>()
        .exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async create(
    team: string,
    dto: CreateTransactionDto,
    actorUserId: string,
  ): Promise<TransactionLean> {
    const playerObjectId = await this.resolvePlayer(team, dto.type, dto.playerId);
    const created = await this.transactionModel.create({
      team,
      type: dto.type,
      amount: dto.amount,
      description: (dto.description ?? '').trim(),
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      player: playerObjectId ?? undefined,
      createdBy: new Types.ObjectId(actorUserId),
    });
    const populated = await this.transactionModel
      .findById(created._id)
      .populate({ path: 'player', select: 'name' })
      .lean<TransactionLean>()
      .exec();
    if (!populated) throw new NotFoundException('Transaction not found after create.');
    return populated;
  }

  async update(
    team: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionLean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid transaction id.');
    }
    const existing = await this.transactionModel.findOne({ _id: id, team }).exec();
    if (!existing) throw new NotFoundException('Transaction not found.');
    const nextType = dto.type ?? existing.type;
    const nextPlayerId = dto.playerId ?? (existing.player ? String(existing.player) : undefined);
    const playerObjectId = await this.resolvePlayer(team, nextType, nextPlayerId);
    const set: Record<string, unknown> = {};
    if (dto.type !== undefined) set.type = dto.type;
    if (dto.amount !== undefined) set.amount = dto.amount;
    if (dto.description !== undefined) set.description = dto.description.trim();
    if (dto.occurredAt !== undefined) set.occurredAt = new Date(dto.occurredAt);
    if (dto.playerId !== undefined || nextType !== existing.type) {
      set.player = playerObjectId ?? null;
    }
    if (Object.keys(set).length > 0) {
      await this.transactionModel.updateOne({ _id: id }, { $set: set }).exec();
    }
    const updated = await this.transactionModel
      .findById(id)
      .populate({ path: 'player', select: 'name' })
      .lean<TransactionLean>()
      .exec();
    if (!updated) throw new NotFoundException('Transaction not found.');
    return updated;
  }

  async remove(team: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid transaction id.');
    }
    const result = await this.transactionModel.deleteOne({ _id: id, team }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Transaction not found.');
    }
  }

  /** Aggregates the team-wide totals used by the balance card. */
  async getBalance(
    team: string,
    memberCount: number,
    outstandingTotal: number,
    monthlyDues: number,
  ): Promise<TeamBalance> {
    const rows = await this.transactionModel
      .aggregate<{ _id: TransactionType; total: number }>([
        { $match: { team } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ])
      .exec();
    const totals = { contributions: 0, income: 0, expenses: 0 };
    for (const row of rows) {
      if (row._id === TransactionType.Contribution) totals.contributions = row.total;
      else if (row._id === TransactionType.Income) totals.income = row.total;
      else if (row._id === TransactionType.Expense) totals.expenses = row.total;
    }
    const balance =
      this.round2(totals.contributions) +
      this.round2(totals.income) -
      this.round2(totals.expenses);
    return {
      team,
      balance: this.round2(balance),
      totals: {
        contributions: this.round2(totals.contributions),
        income: this.round2(totals.income),
        expenses: this.round2(totals.expenses),
      },
      outstandingTotal: this.round2(outstandingTotal),
      memberCount,
      monthlyDues: this.round2(monthlyDues),
    };
  }

  private async resolvePlayer(
    team: string,
    type: TransactionType,
    playerId: string | undefined,
  ): Promise<Types.ObjectId | null> {
    if (type === TransactionType.Contribution) {
      if (!playerId) {
        throw new BadRequestException('A contribution must reference a player.');
      }
      if (!Types.ObjectId.isValid(playerId)) {
        throw new BadRequestException('Invalid player id.');
      }
      const player = await this.playerModel.findById(playerId).select('team').lean().exec();
      if (!player) throw new NotFoundException('Player not found.');
      if ((player.team ?? '').trim() !== team) {
        throw new BadRequestException('Player is not part of your team.');
      }
      return new Types.ObjectId(playerId);
    }
    if (!playerId) return null;
    if (!Types.ObjectId.isValid(playerId)) {
      throw new BadRequestException('Invalid player id.');
    }
    const player = await this.playerModel.findById(playerId).select('team').lean().exec();
    if (!player) throw new NotFoundException('Player not found.');
    if ((player.team ?? '').trim() !== team) {
      throw new BadRequestException('Player is not part of your team.');
    }
    return new Types.ObjectId(playerId);
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
