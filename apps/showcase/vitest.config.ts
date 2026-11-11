import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@cmlab/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
      'virtual:emdash/config': fileURLToPath(new URL('./src/test-fixtures/emdash-runtime-config.ts', import.meta.url)),
    },
  },
  test: {
    server: { deps: { inline: ['emdash'] } },
  },
});
