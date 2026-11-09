import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import Icons from 'unplugin-icons/vite';
import { fileURLToPath } from 'node:url';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
    platformProxy: {
      enabled: true
    }
  }),
  integrations: [
    svelte()
  ],
  server: {
    port: 3000,
    host: true
  },
  vite: {
    server: {
      allowedHosts: true
    },
    plugins: [
      Icons({
        compiler: 'svelte',
        autoInstall: false
      })
    ],
    resolve: {
      alias: [
        {
          find: '@cmlab/core',
          replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url))
        },
        {
          find: '@cmlab/design-tokens/themeEngine',
          replacement: fileURLToPath(new URL('../../packages/design-tokens/themeEngine.ts', import.meta.url))
        },
        {
          find: '@cmlab/design-tokens/tokens.css',
          replacement: fileURLToPath(new URL('../../packages/design-tokens/tokens.css', import.meta.url))
        },
        {
          find: '@cmlab/design-tokens',
          replacement: fileURLToPath(new URL('../../packages/design-tokens/tokens.css', import.meta.url))
        }
      ]
    },
    ssr: {
      noExternal: [
        '@cmlab/core',
        '@cmlab/design-tokens',
        'lucide-svelte',
        '@threlte/core',
        '@threlte/extras',
        'three',
        'zod'
      ]
    }
  }
});
