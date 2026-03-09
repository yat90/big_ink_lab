import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindDecksQueryDto extends PaginationQueryDto {
  color?: string;
  player?: string;
}
