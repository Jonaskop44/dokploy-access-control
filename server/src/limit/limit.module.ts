import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module.js';
import { LimitController } from './limit.controller.js';
import { LimitService } from './limit.service.js';

@Module({
  imports: [UserModule],
  controllers: [LimitController],
  providers: [LimitService],
  exports: [LimitService],
})
export class LimitModule {}
