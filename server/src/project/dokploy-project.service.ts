import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import {
  composeCreate,
  composeDelete,
  composeDeploy,
  composeGetConvertedCompose,
  composeLoadServices,
  composeUpdate,
} from '../config/dokploy/generated/compose/compose.js';
import {
  mountsCreate,
  mountsListByServiceId,
  mountsUpdate,
} from '../config/dokploy/generated/mounts/mounts.js';
import {
  projectCreate,
  projectRemove,
} from '../config/dokploy/generated/project/project.js';
import { DokployProjectCreateResponse } from './types/project.types.js';
import { DokployCompose } from './types/compose.types.js';

export interface GitSource {
  gitUrl: string;
  branch: string;
  composePath: string;
}

export interface DokployProjectRefs {
  dokployProjectId: string;
  composeId: string;
  appName: string;
}

@Injectable()
export class DokployProjectService {
  private readonly logger = new Logger(DokployProjectService.name);

  async create(
    name: string,
    description: string | undefined,
    source: GitSource,
  ) {
    const created = (await projectCreate({
      name,
      description,
    })) as unknown as DokployProjectCreateResponse;
    const dokployProjectId = created.project.projectId;
    const environmentId = created.environment.environmentId;

    try {
      const compose = (await composeCreate({
        name,
        description,
        environmentId,
        composeType: 'docker-compose',
        sourceType: 'git',
      })) as unknown as DokployCompose;
      const composeId = compose.composeId;
      const appName = compose.appName;

      // Only deploys on button click, never via webhook.
      await composeUpdate({
        composeId,
        sourceType: 'git',
        autoDeploy: false,
        ...this.sourceFields(source),
      });

      return { dokployProjectId, composeId, appName };
    } catch (error) {
      await this.removeProject(dokployProjectId);
      throw error;
    }
  }

  async update(
    composeId: string,
    changes: {
      name?: string;
      description?: string | null;
      source?: Partial<GitSource>;
    },
  ) {
    await composeUpdate({
      composeId,
      name: changes.name,
      description: changes.description,
      ...this.sourceFields(changes.source ?? {}),
    });
  }

  async readCompose(composeId: string) {
    await composeLoadServices({ composeId, type: 'fetch' });
    const compose = await composeGetConvertedCompose({ composeId });
    if (typeof compose !== 'string') {
      throw new BadGatewayException('Unexpected Dokploy compose response');
    }

    return compose;
  }

  async deploy(
    ref: { composeId: string; appName: string; composePath: string },
    override: { fileName: string; content: string },
  ) {
    await this.saveOverride(ref.composeId, override);
    const dir = `/etc/dokploy/compose/${ref.appName}/files`;

    await composeUpdate({
      composeId: ref.composeId,
      command: [
        'compose -p',
        ref.appName,
        '--env-file .env',
        `-f ${ref.composePath}`,
        `-f ${dir}/${override.fileName}`,
        'up -d --build --remove-orphans',
      ].join(' '),
    });

    await composeDeploy({ composeId: ref.composeId, title: 'HTL-Dock deploy' });
  }

  private async saveOverride(
    composeId: string,
    override: { fileName: string; content: string },
  ) {
    const mounts: unknown = await mountsListByServiceId({
      serviceType: 'compose',
      serviceId: composeId,
    });
    const existing = Array.isArray(mounts)
      ? (mounts as { mountId?: string; filePath?: string }[]).find(
          (m) => m.filePath === override.fileName,
        )
      : undefined;

    if (existing?.mountId) {
      await mountsUpdate({
        mountId: existing.mountId,
        content: override.content,
      });
      return;
    }
    await mountsCreate({
      type: 'file',
      serviceType: 'compose',
      serviceId: composeId,
      filePath: override.fileName,
      content: override.content,
      mountPath: '/',
    });
  }

  async delete(dokployProjectId: string, composeId: string) {
    await composeDelete({ composeId, deleteVolumes: true });
    await projectRemove({ projectId: dokployProjectId });
  }

  async removeProject(dokployProjectId: string) {
    try {
      await projectRemove({ projectId: dokployProjectId });
    } catch {
      this.logger.error(`Orphaned Dokploy project ${dokployProjectId}`);
    }
  }

  private sourceFields(source: Partial<GitSource>) {
    return {
      customGitUrl: source.gitUrl,
      customGitBranch: source.branch,
      composePath: source.composePath,
    };
  }
}
