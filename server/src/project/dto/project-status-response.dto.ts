import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export const PROJECT_STATUSES = [
  'NOT_DEPLOYED',
  'DEPLOYING',
  'RUNNING',
  'STOPPED',
  'ERROR',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export class ProjectContainerResponseDto {
  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  state: string;
}

export class ProjectStatusResponseDto {
  @ApiProperty({ enum: PROJECT_STATUSES })
  @Expose()
  status: ProjectStatus;

  @ApiProperty({ type: [ProjectContainerResponseDto] })
  @Expose()
  @Type(() => ProjectContainerResponseDto)
  containers: ProjectContainerResponseDto[];
}
