import { IsOptional, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindMatchesQueryDto extends PaginationQueryDto {
  stage?: string;
  sort?: 'newest' | 'oldest';

  /** Filter matches played on or after this date (ISO date string, e.g. YYYY-MM-DD). */
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  /** Filter matches played on or before this date (ISO date string). */
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
