import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindMatchesQueryDto extends PaginationQueryDto {
  stage?: string;
  sort?: 'newest' | 'oldest';
}
