import { defineConfig } from 'orval';

export default defineConfig({
  dokploy: {
    input: {
      target: './dokploy-openapi.json',
      // Only the parts of Dokploy's API we use; widen when needed.
      filters: {
        tags: ['project', 'environment', 'compose', 'deployment', 'docker', 'mounts'],
      },
    },
    output: {
      mode: 'tags-split',
      target: './src/config/dokploy/generated',
      schemas: './src/config/dokploy/generated/models',
      client: 'axios-functions',
      indexFiles: false,
      override: {
        mutator: {
          path: './src/config/dokploy/dokploy-instance.ts',
          name: 'dokployInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
