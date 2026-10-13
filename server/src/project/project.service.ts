import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma/prisma.service.js';
import { Prisma } from '../config/prisma/generated/client.js';
import { ProjectRole, Role } from '../config/prisma/generated/enums.js';
import { UserService } from '../user/user.service.js';
import type { CreateProjectDto } from './dto/create-project.dto.js';
import type { UpdateProjectDto } from './dto/update-project.dto.js';
import { DokployProjectService } from './dokploy-project.service.js';

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
    private readonly dokploy: DokployProjectService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const source = {
      gitUrl: dto.gitUrl,
      branch: dto.branch,
      composePath: dto.composePath,
    };
    const refs = await this.dokploy.create(dto.name, dto.description, source);

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
      await this.dokploy.removeProject(refs.dokployProjectId);
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

    await this.dokploy.update(project.composeId, {
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

  async remove(userId: string, projectId: string) {
    const { project, canManage } = await this.getAccess(userId, projectId);
    if (!canManage) throw new ForbiddenException('Only the owner can delete');

    // Dokploy first: if it fails the project stays visible and can be retried.
    await this.dokploy.delete(project.dokployProjectId, project.composeId);
    await this.prisma.project.delete({ where: { id: projectId } });
  }

  /**
   * Single permission gate, runs before anything talks to Dokploy. Non-members
   * get a 404 so project ids cannot be probed.
   */
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
