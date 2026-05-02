import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { Role } from '../auth/roles.enum';
import { Roles } from '../auth/roles.decorator';
import { TeamContextService } from './team-context.service';
import {
  ListTransactionsResult,
  TeamTransactionsService,
} from './team-transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FindTransactionsQueryDto } from './dto/find-transactions-query.dto';
import {
  PaginatedResponse,
  createPaginatedResponse,
} from '../common/dto/paginated-response.dto';
import { DEFAULT_PAGE_SIZE } from '../constants';
import { toPopulatedRef } from './populated-ref.util';

type TransactionResponse = {
  _id: string;
  type: string;
  amount: number;
  description: string;
  occurredAt: string;
  createdAt: string | null;
  player: { _id: string; name: string } | null;
};

@Controller('team/transactions')
export class TeamTransactionsController {
  constructor(
    private readonly contextService: TeamContextService,
    private readonly transactionsService: TeamTransactionsService,
  ) {}

  /** Full transactions list — admin only. Members use `/team/transactions/me`. */
  @Get()
  @Roles(Role.Admin)
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindTransactionsQueryDto,
  ): Promise<PaginatedResponse<TransactionResponse>> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const result = await this.transactionsService.list(ctx.team, query);
    return createPaginatedResponse(this.toResponses(result), result.total, page, limit);
  }

  /** Authenticated member's own contribution history (read-only). */
  @Get('me')
  async listMine(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindTransactionsQueryDto,
  ): Promise<PaginatedResponse<TransactionResponse>> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    if (!ctx.playerId) {
      throw new BadRequestException('Your account is not linked to a player.');
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const result = await this.transactionsService.listByPlayer(
      ctx.team,
      ctx.playerId,
      page,
      limit,
    );
    return createPaginatedResponse(this.toResponses(result), result.total, page, limit);
  }

  /** Contributions for a single player (admin or the player themselves). */
  @Get('player/:playerId')
  async listForPlayer(
    @CurrentUser() user: JwtPayload,
    @Param('playerId') playerId: string,
    @Query() query: FindTransactionsQueryDto,
  ): Promise<PaginatedResponse<TransactionResponse>> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    if (ctx.role !== Role.Admin && ctx.playerId !== playerId) {
      throw new ForbiddenException('You can only view your own contribution history.');
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const result = await this.transactionsService.listByPlayer(
      ctx.team,
      playerId,
      page,
      limit,
    );
    return createPaginatedResponse(this.toResponses(result), result.total, page, limit);
  }

  @Post()
  @Roles(Role.Admin)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponse> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    const created = await this.transactionsService.create(ctx.team, dto, ctx.userId);
    return this.toResponse(created);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionResponse> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    const updated = await this.transactionsService.update(ctx.team, id, dto);
    return this.toResponse(updated);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    const ctx = await this.contextService.getRequiredContext(user.sub);
    await this.transactionsService.remove(ctx.team, id);
  }

  private toResponses(result: ListTransactionsResult): TransactionResponse[] {
    return result.data.map((t) => this.toResponse(t));
  }

  private toResponse(t: ListTransactionsResult['data'][number]): TransactionResponse {
    return {
      _id: String(t._id),
      type: t.type,
      amount: t.amount,
      description: t.description,
      occurredAt: t.occurredAt.toISOString(),
      createdAt: t.createdAt ? t.createdAt.toISOString() : null,
      player: toPopulatedRef(t.player),
    };
  }
}
