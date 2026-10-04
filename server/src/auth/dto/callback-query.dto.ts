import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export class CallbackQueryDto extends createZodDto(CallbackQuerySchema) {}
