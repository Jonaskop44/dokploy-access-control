import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Relative path inside the repo; `..` segments could escape the clone.
const SAFE_RELATIVE_PATH = /^(?!\/)(?!.*(^|\/)\.\.(\/|$))[\w.\-/]+$/;

export class CreateProjectDto {
  @ApiProperty({ maxLength: 60 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'https://gitlab.com/group/repo.git' })
  @Transform(trim)
  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: true })
  @MaxLength(300)
  gitUrl: string;

  @ApiProperty({ default: 'main' })
  @Transform(trim)
  @Matches(/^[\w.\-/]+$/, { message: 'branch contains invalid characters' })
  @MaxLength(100)
  branch: string;

  @ApiProperty({ default: './docker-compose.yml' })
  @Transform(trim)
  @Matches(SAFE_RELATIVE_PATH, {
    message: 'composePath must be a relative path inside the repository',
  })
  @MaxLength(200)
  composePath: string;
}
