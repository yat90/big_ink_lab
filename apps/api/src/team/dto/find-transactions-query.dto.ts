import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { TRANSACTION_TYPE_VALUES, TransactionType } from '../team.constants';

export class FindTransactionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TRANSACTION_TYPE_VALUES)
  type?: TransactionType;

  @IsOptional()
  @IsMongoId()
  playerId?: string;
}
