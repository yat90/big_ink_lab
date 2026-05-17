import { IsMongoId, IsNotEmpty } from 'class-validator';

export class MergePlayerDto {
  @IsMongoId()
  @IsNotEmpty()
  sourceId: string;

  @IsMongoId()
  @IsNotEmpty()
  targetId: string;
}
