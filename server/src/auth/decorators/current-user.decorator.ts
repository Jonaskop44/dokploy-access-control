import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (key: keyof Express.User | undefined, context: ExecutionContext) => {
    const { user } = context.switchToHttp().getRequest<Request>();
    return key ? user?.[key] : user;
  },
);
