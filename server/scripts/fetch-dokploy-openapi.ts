import { writeFileSync } from 'node:fs';

process.loadEnvFile();

const baseUrl = process.env.DOKPLOY_URL?.replace(/\/+$/, '');
const apiKey = process.env.DOKPLOY_API_KEY;
if (!baseUrl || !apiKey) {
  throw new Error('DOKPLOY_URL and DOKPLOY_API_KEY must be set in .env');
}

const response = await fetch(`${baseUrl}/api/settings.getOpenApiDocument`, {
  headers: { 'x-api-key': apiKey },
});
if (!response.ok) {
  throw new Error(`Fetching Dokploy OpenAPI failed: ${response.status}`);
}

writeFileSync('dokploy-openapi.json', await response.text());
