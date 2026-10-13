import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module.js';
import { DokployProjectService } from './dokploy-project.service.js';
import { ProjectController } from './project.controller.js';
import { ProjectService } from './project.service.js';

@Module({
  imports: [UserModule],
  controllers: [ProjectController],
  providers: [ProjectService, DokployProjectService],
})
export class ProjectModule {}
