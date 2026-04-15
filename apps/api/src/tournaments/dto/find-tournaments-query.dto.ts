import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindTournamentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  meta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  /** Inclusive lower bound (calendar day, UTC). */
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  /** Inclusive upper bound (calendar day, UTC). */
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
