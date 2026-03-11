import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query DTO for listing decks with optional filters. */
export class FindDecksQueryDto extends PaginationQueryDto {
  /** Filter by deck color. */
  @IsOptional()
  @IsString()
  color?: string;

  /** Filter by player id. */
  @IsOptional()
  @IsString()
  player?: string;

  /** Filter decks by name (case-insensitive partial match). */
  @IsOptional()
  @IsString()
  name?: string;
}
