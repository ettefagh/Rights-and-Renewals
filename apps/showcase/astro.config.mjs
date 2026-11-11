import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import emdash from 'emdash/astro';
import { d1, r2 } from '@emdash-cms/cloudflare';
import Icons from 'unplugin-icons/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
    prerenderEnvironment: 'node',
  }),
  integrations: [
    svelte(),
    react(),
    emdash({
      database: d1({ binding: 'DB' }),
      storage: r2({ binding: 'MEDIA' }),
      plugins: [
        {
          id: 'cmlab-editorial-proposals',
          version: '1.0.0',
          entrypoint: fileURLToPath(new URL('./src/lib/editorial-proposals-plugin.ts', import.meta.url)).replaceAll('\\', '/'),
          format: 'native',
          capabilities: ['hooks.content-policy:register', 'content:read'],
          hooks: ['content:beforePublish', 'content:beforeSchedule'],
          routes: ['proposeDraft', 'listOwnDrafts', 'listReviewerDrafts'],
        },
        {
          id: 'cmlab-policy-graph-review',
          version: '1.0.0',
          entrypoint: fileURLToPath(new URL('./src/lib/policy-graph-plugin.ts', import.meta.url)).replaceAll('\\', '/'),
          format: 'native',
          capabilities: ['content:read', 'content:write', 'content:publish', 'hooks.content-policy:register'],
          hooks: ['content:beforeSave', 'content:beforePublish', 'content:beforeSchedule'],
          routes: ['reviewAssessment', 'approveAssessment'],
        },
        {
          id: 'cmlab-policy-publication-guard',
          version: '1.0.0',
          entrypoint: fileURLToPath(new URL('./src/lib/policy-publication-guard.ts', import.meta.url)).replaceAll('\\', '/'),
          format: 'standard',
          capabilities: ['hooks.content-policy:register'],
          hooks: ['content:beforePublish'],
        },
        {
          id: 'cmlab-policy-review-console',
          version: '1.0.0',
          entrypoint: fileURLToPath(new URL('./src/lib/policy-review-console.ts', import.meta.url)).replaceAll('\\', '/'),
          adminEntry: fileURLToPath(new URL('./src/admin/index.tsx', import.meta.url)).replaceAll('\\', '/'),
          format: 'native',
          capabilities: ['content:read'],
        },
      ],
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },
  vite: {
    server: { allowedHosts: true },
    plugins: [
      Icons({
        compiler: 'svelte',
        autoInstall: false,
      }),
    ],
    resolve: {
      alias: [
        {
          find: '@cmlab/core',
          replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
        },
        {
          find: '@cmlab/design-tokens/themeEngine',
          replacement: fileURLToPath(new URL('../../packages/design-tokens/themeEngine.ts', import.meta.url)),
        },
        {
          find: '@cmlab/design-tokens/tokens.css',
          replacement: fileURLToPath(new URL('../../packages/design-tokens/tokens.css', import.meta.url)),
        },
        {
          find: '@cmlab/design-tokens',
          replacement: fileURLToPath(new URL('../../packages/design-tokens/tokens.css', import.meta.url)),
        },
      ],
    },
    ssr: {
      noExternal: [
        '@cmlab/core',
        '@cmlab/design-tokens',
        'lucide-svelte',
        '@threlte/core',
        '@threlte/extras',
        'three',
        'zod',
        'emdash',
        '@emdash-cms/admin',
        '@emdash-cms/cloudflare',
      ],
    },
  },
});
