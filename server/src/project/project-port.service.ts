import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../config/app-config/app-config.service.js';
import { PrismaService } from '../config/prisma/prisma.service.js';
import type { ComposePort } from './compose/analyze-compose.js';

const MAX_ATTEMPTS = 5;

@Injectable()
export class ProjectPortService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * Makes `ProjectPort` match the ports the compose file publishes: unchanged
   * entries keep their host port (stable address across redeploys), new ones
   * get a free port, removed ones are freed. `hostPort` is globally unique, so
   * two deploys racing for the same free port make one transaction fail and
   * retry with a fresh view.
   */
  async sync(projectId: string, wanted: ComposePort[]) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const existing = await tx.projectPort.findMany({
            where: { projectId },
          });
          const key = (p: {
            serviceName: string;
            containerPort: number;
            protocol: string;
          }) => `${p.serviceName}/${p.containerPort}/${p.protocol}`;
          const wantedKeys = new Set(wanted.map(key));

          const stale = existing.filter((p) => !wantedKeys.has(key(p)));
          if (stale.length) {
            await tx.projectPort.deleteMany({
              where: { id: { in: stale.map((p) => p.id) } },
            });
          }

          const kept = new Set(existing.map((p) => key(p)));
          const toCreate = wanted.filter((p) => !kept.has(key(p)));
          if (toCreate.length) {
            const used = new Set(
              (
                await tx.projectPort.findMany({ select: { hostPort: true } })
              ).map((p) => p.hostPort),
            );
            const free = this.freePorts(used, toCreate.length);
            await tx.projectPort.createMany({
              data: toCreate.map((p, i) => ({
                projectId,
                serviceName: p.serviceName,
                containerPort: p.containerPort,
                protocol: p.protocol,
                hostPort: free[i],
              })),
            });
          }

          return tx.projectPort.findMany({
            where: { projectId },
            orderBy: [{ serviceName: 'asc' }, { containerPort: 'asc' }],
          });
        });
      } catch (error) {
        const collided =
          error instanceof Error &&
          'code' in error &&
          (error as { code: unknown }).code === 'P2002';
        if (!collided || attempt >= MAX_ATTEMPTS) throw error;
      }
    }
  }

  private freePorts(used: Set<number>, count: number): number[] {
    const { start, end } = this.appConfig.projectPortRange;
    const free: number[] = [];
    for (let port = start; port <= end && free.length < count; port++) {
      if (!used.has(port)) free.push(port);
    }
    if (free.length < count) {
      throw new ServiceUnavailableException('No free host ports left');
    }
    return free;
  }
}
