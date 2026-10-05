import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LoginQuerySchema = z
  .object({
    rememberMe: z.boolean().optional().default(false),
  })
  .strict();

export class LoginQueryDto extends createZodDto(LoginQuerySchema) {}
