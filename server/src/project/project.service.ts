import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma/prisma.service.js';
import { Prisma } from '../config/prisma/generated/client.js';
import { ProjectRole, Role } from '../config/prisma/generated/enums.js';
import { UserService } from '../user/user.service.js';
import type { CreateProjectDto } from './dto/create-project.dto.js';
import type { ProjectStatus } from './dto/project-status-response.dto.js';
import type { UpdateProjectDto } from './dto/update-project.dto.js';
import { analyzeCompose } from './compose/analyze-compose.js';
import { buildOverride, OVERRIDE_FILE_NAME } from './compose/build-override.js';
import { LimitService } from '../limit/limit.service.js';
import { DokployProjectService } from './dokploy-project.service.js';
import { ProjectPortService } from './project-port.service.js';

const withMembers = {
  members: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.ProjectInclude;

type ProjectWithMembers = Prisma.ProjectGetPayload<{
  include: typeof withMembers;
}>;

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly dokployService: DokployProjectService,
    private readonly portsService: ProjectPortService,
    private readonly limitService: LimitService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    await this.assertProjectLimit(userId);

    const source = {
      gitUrl: dto.gitUrl,
      branch: dto.branch,
      composePath: dto.composePath,
    };
    const refs = await this.dokployService.create(
      dto.name,
      dto.description,
      source,
    );

    try {
      const project = await this.prisma.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          ...source,
          ...refs,
          members: { create: { userId, role: ProjectRole.OWNER } },
        },
        include: withMembers,
      });

      return this.toResponse(project, userId);
    } catch (error) {
      await this.dokployService.removeProject(refs.dokployProjectId);
      throw error;
    }
  }

  async findAll(userId: string) {
    const user = await this.userService.findById(userId);
    const projects = await this.prisma.project.findMany({
      where:
        user.role === Role.TEACHER
          ? undefined
          : { members: { some: { userId } } },
      include: withMembers,
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((project) => this.toResponse(project, userId));
  }

  async findOne(userId: string, projectId: string) {
    const { project } = await this.getAccess(userId, projectId);

    return this.toResponse(project, userId);
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    const { project, canManage } = await this.getAccess(userId, projectId);
    if (!canManage) throw new ForbiddenException('Only the owner can edit');

    await this.dokployService.update(project, {
      name: dto.name,
      description: dto.description,
      source: {
        gitUrl: dto.gitUrl,
        branch: dto.branch,
        composePath: dto.composePath,
      },
    });

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        description: dto.description,
        gitUrl: dto.gitUrl,
        branch: dto.branch,
        composePath: dto.composePath,
      },
      include: withMembers,
    });

    return this.toResponse(updated, userId);
  }

  async deploy(userId: string, projectId: string) {
    const { project, canManage, isTeacher } = await this.getAccess(
      userId,
      projectId,
    );
    if (!canManage) throw new ForbiddenException('Only the owner can deploy');

    const { status } = await this.readStatus(project);
    await this.assertRunLimit(project, isTeacher, status);

    const compose = await this.dokployService.readCompose(project.composeId);
    const { ports: wanted, serviceNames } = analyzeCompose(
      compose,
      project.composePath,
    );
    const ports = await this.portsService.sync(projectId, wanted);
    const limits = await this.limitService.resolve(
      await this.getOwner(project),
    );

    await this.dokployService.deploy(
      {
        composeId: project.composeId,
        appName: project.appName,
        composePath: project.composePath,
      },
      {
        fileName: OVERRIDE_FILE_NAME,
        content: buildOverride(ports, serviceNames, limits),
      },
    );

    return { ports };
  }

  async start(userId: string, projectId: string) {
    const { project, isTeacher } = await this.getAccess(userId, projectId);
    const { status } = await this.readStatus(project);
    if (status === 'NOT_DEPLOYED') {
      throw new ConflictException('Project has not been deployed yet');
    }
    await this.assertRunLimit(project, isTeacher, status);

    await this.dokployService.start(project.appName);

    return this.readStatus(project);
  }

  async stop(userId: string, projectId: string) {
    const { project } = await this.getAccess(userId, projectId);
    await this.assertDeployed(project);

    await this.dokployService.stop(project.composeId);

    return this.readStatus(project);
  }

  async getStatus(userId: string, projectId: string) {
    const { project } = await this.getAccess(userId, projectId);

    return this.readStatus(project);
  }

  async remove(userId: string, projectId: string) {
    const { project, canManage } = await this.getAccess(userId, projectId);
    if (!canManage) throw new ForbiddenException('Only the owner can delete');

    await this.dokployService.delete(
      project.dokployProjectId,
      project.composeId,
    );
    await this.prisma.project.delete({ where: { id: projectId } });
  }

  private async assertDeployed(project: ProjectWithMembers) {
    const { status } = await this.readStatus(project);
    if (status === 'NOT_DEPLOYED') {
      throw new ConflictException('Project has not been deployed yet');
    }
  }

  // Only creating and starting are blocked; running projects stay up. A group
  // project counts against its owner, and teachers are exempt.
  private async assertProjectLimit(userId: string) {
    const user = await this.userService.findById(userId);
    if (user.role === Role.TEACHER) return;

    const [limits, owned] = await Promise.all([
      this.limitService.resolve(user),
      this.prisma.projectMember.count({
        where: { userId, role: ProjectRole.OWNER },
      }),
    ]);

    if (owned >= limits.maxProjects) {
      throw new ForbiddenException(
        `Project limit reached (${limits.maxProjects}). Contact your teacher.`,
      );
    }
  }

  private async assertRunLimit(
    project: ProjectWithMembers,
    isTeacher: boolean,
    status: ProjectStatus,
  ) {
    if (isTeacher || status === 'RUNNING' || status === 'DEPLOYING') return;

    const owner = await this.getOwner(project);
    const [limits, others] = await Promise.all([
      this.limitService.resolve(owner),
      this.prisma.project.findMany({
        where: {
          id: { not: project.id },
          members: { some: { userId: owner.id, role: ProjectRole.OWNER } },
        },
      }),
    ]);
    const statuses = await Promise.all(others.map((p) => this.readStatus(p)));
    const running = statuses.filter(
      (s) => s.status === 'RUNNING' || s.status === 'DEPLOYING',
    ).length;

    if (running >= limits.maxRunningProjects) {
      throw new ForbiddenException(
        `Running project limit reached (${limits.maxRunningProjects}). Stop another project or contact your teacher.`,
      );
    }
  }

  private async getOwner(project: ProjectWithMembers) {
    const owner = project.members.find((m) => m.role === ProjectRole.OWNER);
    if (!owner) throw new InternalServerErrorException('Project has no owner');

    return this.userService.findById(owner.userId);
  }

  private async readStatus(
    project: Pick<ProjectWithMembers, 'composeId' | 'appName'>,
  ) {
    const { composeStatus, containers, hasDeployments } =
      await this.dokployService.readStatus(project.composeId, project.appName);
    const running = containers.some((c) => c.state === 'running');

    let status: ProjectStatus;
    if (composeStatus === 'running') status = 'DEPLOYING';
    else if (composeStatus === 'error') status = 'ERROR';
    else if (running) status = 'RUNNING';
    else if (composeStatus === 'done') status = 'ERROR';
    else status = hasDeployments ? 'STOPPED' : 'NOT_DEPLOYED';

    return {
      status,
      containers: containers.map((c) => ({ name: c.name, state: c.state })),
    };
  }

  private async getAccess(userId: string, projectId: string) {
    const [user, project] = await Promise.all([
      this.userService.findById(userId),
      this.prisma.project.findUnique({
        where: { id: projectId },
        include: withMembers,
      }),
    ]);

    const membership = project?.members.find((m) => m.userId === userId);
    const isTeacher = user.role === Role.TEACHER;
    if (!project || (!membership && !isTeacher)) {
      throw new NotFoundException('Project not found');
    }

    return {
      project,
      isTeacher,
      canManage: isTeacher || membership?.role === ProjectRole.OWNER,
    };
  }

  private toResponse(project: ProjectWithMembers, userId: string) {
    const owner = project.members.find((m) => m.role === ProjectRole.OWNER);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      gitUrl: project.gitUrl,
      branch: project.branch,
      composePath: project.composePath,
      myRole: project.members.find((m) => m.userId === userId)?.role ?? null,
      ownerName: owner?.user.name ?? '',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
