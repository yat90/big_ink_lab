import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { DEFAULT_PAGE_SIZE, PAGINATION_MAX_LIMIT } from '../../constants';

/** Base query DTO for paginated list endpoints. */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit?: number = DEFAULT_PAGE_SIZE;
}
