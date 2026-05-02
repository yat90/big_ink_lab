import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_TRANSACTION_AMOUNT,
  MIN_TRANSACTION_AMOUNT,
  TEAM_TEXT_MAX_LENGTH,
  TRANSACTION_TYPE_VALUES,
  TransactionType,
} from '../team.constants';

export class UpdateTransactionDto {
  @IsOptional()
  @IsEnum(TRANSACTION_TYPE_VALUES)
  type?: TransactionType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_TRANSACTION_AMOUNT)
  @Max(MAX_TRANSACTION_AMOUNT)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(TEAM_TEXT_MAX_LENGTH)
  description?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsMongoId()
  playerId?: string;
}
