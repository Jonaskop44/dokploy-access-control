import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../app-config/app-config.service.js';
import { dokployAxios } from './dokploy-instance.js';

@Global()
@Module({})
export class DokployModule {
  constructor(appConfig: AppConfigService) {
    dokployAxios.defaults.baseURL = `${appConfig.dokployUrl.replace(/\/+$/, '')}/api`;
    dokployAxios.defaults.headers.common['x-api-key'] = appConfig.dokployApiKey;
  }
}
