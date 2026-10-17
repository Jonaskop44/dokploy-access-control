import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export const LIMIT_LEVELS = ['GLOBAL', 'CLASS', 'USER'] as const;

export type LimitLevel = (typeof LIMIT_LEVELS)[number];

export class LimitResponseDto {
  @ApiProperty({ enum: LIMIT_LEVELS })
  @Expose()
  level: LimitLevel;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  className: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  @Expose()
  userId: string | null;

  @ApiProperty({ type: Number, nullable: true })
  @Expose()
  maxProjects: number | null;

  @ApiProperty({ type: Number, nullable: true })
  @Expose()
  maxRunningProjects: number | null;

  @ApiProperty({ type: Number, nullable: true })
  @Expose()
  cpuLimit: number | null;

  @ApiProperty({ type: Number, nullable: true })
  @Expose()
  memoryMb: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @Expose()
  updatedAt: Date;
}

export class EffectiveLimitsResponseDto {
  @ApiProperty()
  @Expose()
  maxProjects: number;

  @ApiProperty()
  @Expose()
  maxRunningProjects: number;

  @ApiProperty({ description: 'CPU cores per container' })
  @Expose()
  cpuLimit: number;

  @ApiProperty({ description: 'RAM in MB per container' })
  @Expose()
  memoryMb: number;
}
