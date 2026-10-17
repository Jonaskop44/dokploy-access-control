import { Module } from '@nestjs/common';
import { LimitModule } from '../limit/limit.module.js';
import { UserModule } from '../user/user.module.js';
import { DokployProjectService } from './dokploy-project.service.js';
import { ProjectController } from './project.controller.js';
import { ProjectPortService } from './project-port.service.js';
import { ProjectService } from './project.service.js';

@Module({
  imports: [UserModule, LimitModule],
  controllers: [ProjectController],
  providers: [ProjectService, DokployProjectService, ProjectPortService],
})
export class ProjectModule {}
