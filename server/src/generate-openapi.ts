import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import { AppModule } from './app.module.js';
import { buildSwaggerDocument } from './swagger.config.js';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  const document = buildSwaggerDocument(app);
  writeFileSync('openapi.json', `${JSON.stringify(document, null, 2)}\n`);

  await app.close();
  console.log('OpenAPI document written to openapi.json');
}

await generate();
