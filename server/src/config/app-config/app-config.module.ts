import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AppConfigService } from './app-config.service.js';

@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [AppConfigService],
  exports: [AppConfigService, PassportModule],
})
export class AppConfigModule {}
