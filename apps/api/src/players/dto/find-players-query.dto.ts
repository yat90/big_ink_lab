import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

function queryBool(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  }
  return false;
}

export class FindPlayersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  team?: string;

  /** When true, include guest players in results. Default is false (guests hidden). */
  @IsOptional()
  @Transform(({ value }) => queryBool(value))
  @IsBoolean()
  includeGuests?: boolean;

  /** When true, return only guest players (`isGuest: true`). Takes precedence over includeGuests. */
  @IsOptional()
  @Transform(({ value }) => queryBool(value))
  @IsBoolean()
  guestsOnly?: boolean;
}
