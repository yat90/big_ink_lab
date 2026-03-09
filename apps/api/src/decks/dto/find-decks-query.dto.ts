import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindDecksQueryDto extends PaginationQueryDto {
  color?: string;
  player?: string;

  /** Filter decks by name (case-insensitive partial match). */
  @IsOptional()
  @IsString()
  name?: string;
}
