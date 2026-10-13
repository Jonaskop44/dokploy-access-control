import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Role } from '../../config/prisma/generated/enums.js';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ format: 'email' })
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty({ enum: Role })
  @Expose()
  role: Role;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  className: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Expose()
  updatedAt: Date;
}
