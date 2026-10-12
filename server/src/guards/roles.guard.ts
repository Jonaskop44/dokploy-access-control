import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import type { Role } from '../config/prisma/generated/enums.js';
import { UserService } from '../user/user.service.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;

    const { user } = context.switchToHttp().getRequest<Request>();
    const dbUser = user ? await this.userService.findByIdOrNull(user.id) : null;
    if (!dbUser || !roles.includes(dbUser.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
