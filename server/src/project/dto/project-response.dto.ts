import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ProjectRole } from '../../config/prisma/generated/enums.js';

export class ProjectResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  description: string | null;

  @ApiProperty()
  @Expose()
  gitUrl: string;

  @ApiProperty()
  @Expose()
  branch: string;

  @ApiProperty()
  @Expose()
  composePath: string;

  @ApiProperty({ enum: ProjectRole, nullable: true })
  @Expose()
  myRole: ProjectRole | null;

  @ApiProperty()
  @Expose()
  ownerName: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Expose()
  updatedAt: Date;
}
