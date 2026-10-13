import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ProjectPortResponseDto {
  @ApiProperty()
  @Expose()
  serviceName: string;

  @ApiProperty()
  @Expose()
  containerPort: number;

  @ApiProperty({ enum: ['tcp', 'udp'] })
  @Expose()
  protocol: string;

  @ApiProperty()
  @Expose()
  hostPort: number;
}

export class DeployResponseDto {
  @ApiProperty({ type: [ProjectPortResponseDto] })
  @Expose()
  @Type(() => ProjectPortResponseDto)
  ports: ProjectPortResponseDto[];
}
