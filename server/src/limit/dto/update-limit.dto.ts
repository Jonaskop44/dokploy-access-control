import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';

export class UpdateLimitDto {
  @ApiProperty({ type: Number, minimum: 1 })
  @IsInt()
  @Min(1)
  maxProjects: number;

  @ApiProperty({ type: Number, minimum: 1 })
  @IsInt()
  @Min(1)
  maxRunningProjects: number;

  @ApiProperty({
    type: Number,
    minimum: 0.1,
    description: 'CPU cores per container',
  })
  @IsNumber()
  @Min(0.1)
  cpuLimit: number;

  @ApiProperty({
    type: Number,
    minimum: 64,
    description: 'RAM in MB per container',
  })
  @IsInt()
  @Min(64)
  memoryMb: number;
}
