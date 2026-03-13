import { IsOptional, IsDateString, IsMongoId } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindMatchesQueryDto extends PaginationQueryDto {
  stage?: string;
  sort?: 'newest' | 'oldest';

  /** Filter matches where this player participated (p1 or p2). */
  @IsOptional()
  @IsMongoId()
  player?: string;

  /** Filter matches where this deck was used (p1Deck or p2Deck). */
  @IsOptional()
  @IsMongoId()
  deck?: string;

  /** Filter matches played on or after this date (ISO date string, e.g. YYYY-MM-DD). */
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  /** Filter matches played on or before this date (ISO date string). */
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
