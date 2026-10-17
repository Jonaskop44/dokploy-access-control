import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../config/prisma/prisma.service.js';
import type { Limit, User } from '../config/prisma/generated/client.js';
import { UserService } from '../user/user.service.js';
import type { LimitLevel } from './dto/limit-response.dto.js';
import type { UpdateLimitDto } from './dto/update-limit.dto.js';
import { AppConfigService } from '../config/app-config/app-config.service.js';

const FIELDS = [
  'maxProjects',
  'maxRunningProjects',
  'cpuLimit',
  'memoryMb',
] as const;

export interface EffectiveLimits {
  maxProjects: number;
  maxRunningProjects: number;
  cpuLimit: number;
  memoryMb: number;
}

@Injectable()
export class LimitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly appConfig: AppConfigService,
  ) {}

  /** Student overrides class, class overrides global; null inherits. */
  async resolve(user: User) {
    const rows = await this.prisma.limit.findMany({
      where: {
        OR: [
          { id: this.appConfig.globalLimitId },
          { userId: user.id },
          ...(user.className ? [{ className: user.className }] : []),
        ],
      },
    });
    const global = rows.find((r) => r.id === this.appConfig.globalLimitId);
    const byUser = rows.find((r) => r.userId === user.id);
    const byClass = user.className
      ? rows.find((r) => r.className === user.className)
      : undefined;

    const resolved: Partial<EffectiveLimits> = {};
    for (const field of FIELDS) {
      resolved[field] =
        byUser?.[field] ?? byClass?.[field] ?? global?.[field] ?? undefined;
    }
    if (FIELDS.some((field) => resolved[field] === undefined)) {
      throw new InternalServerErrorException('Global limits are incomplete');
    }
    return resolved as EffectiveLimits;
  }

  async resolveForUserId(userId: string) {
    const user = await this.userService.findById(userId);

    return this.resolve(user);
  }

  async findAll() {
    const rows = await this.prisma.limit.findMany({
      orderBy: [{ className: 'asc' }, { updatedAt: 'desc' }],
    });

    return rows.map((row) => this.toResponse(row));
  }

  async setGlobal(dto: UpdateLimitDto) {
    const row = await this.prisma.limit.update({
      where: { id: this.appConfig.globalLimitId },
      data: this.toData(dto),
    });

    return this.toResponse(row);
  }

  async setForClass(className: string, dto: UpdateLimitDto) {
    const data = this.toData(dto);
    const row = await this.prisma.limit.upsert({
      where: { className },
      create: { className, ...data },
      update: data,
    });

    return this.toResponse(row);
  }

  async setForUser(userId: string, dto: UpdateLimitDto) {
    await this.userService.findById(userId);
    const data = this.toData(dto);
    const row = await this.prisma.limit.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return this.toResponse(row);
  }

  async removeForClass(className: string) {
    await this.prisma.limit.deleteMany({ where: { className } });
  }

  async removeForUser(userId: string) {
    await this.prisma.limit.deleteMany({ where: { userId } });
  }

  private toData(dto: UpdateLimitDto) {
    return {
      maxProjects: dto.maxProjects,
      maxRunningProjects: dto.maxRunningProjects,
      cpuLimit: dto.cpuLimit,
      memoryMb: dto.memoryMb,
    };
  }

  private toResponse(row: Limit) {
    const level: LimitLevel = row.userId
      ? 'USER'
      : row.className
        ? 'CLASS'
        : 'GLOBAL';
    return {
      level,
      className: row.className,
      userId: row.userId,
      maxProjects: row.maxProjects,
      maxRunningProjects: row.maxRunningProjects,
      cpuLimit: row.cpuLimit,
      memoryMb: row.memoryMb,
      updatedAt: row.updatedAt,
    };
  }
}
