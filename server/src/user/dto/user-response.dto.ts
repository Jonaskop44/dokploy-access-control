import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Role } from '../../config/prisma/generated/enums.js';

export const UserResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  role: z.enum(Role),
  createdAt: z.date(),
});

export class UserResponseDto extends createZodDto(UserResponseSchema) {}
