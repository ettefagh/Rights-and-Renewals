import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import emdash from 'emdash/astro';
import { d1, r2 } from '@emdash-cms/cloudflare';
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
    svelte(),
    react(),
    emdash({
      database: d1({ binding: 'DB' }),
      storage: r2({ binding: 'MEDIA' }),
    }),
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
      }),
      {
        name: 'emdash-astro-compat',
        enforce: 'pre',
        resolveId(id) {
          if (id === 'virtual:astro:assets/fonts/internal') {
            return '\0virtual:astro:assets/fonts/internal';
          }
          if (id === 'astro/zod' || id.endsWith('astro/dist/zod.js') || id.endsWith('astro\\dist\\zod.js')) {
            return fileURLToPath(new URL('./src/shims/astro-zod.mjs', import.meta.url));
          }
          if (id === 'cloudflare:workers') {
            return fileURLToPath(new URL('./src/shims/cloudflare-workers.mjs', import.meta.url));
          }
        },
        load(id) {
          if (id === '\0virtual:astro:assets/fonts/internal') {
            return 'export const componentDataByCssVariable = new Map(); export default {};';
          }
        },
        config(config) {
          if (config.ssr?.optimizeDeps) {
            config.ssr.optimizeDeps.noDiscovery = true;
            config.ssr.optimizeDeps.include = [];
          }
          if (config.ssr?.external && Array.isArray(config.ssr.external)) {
            config.ssr.external = config.ssr.external.filter(x => x !== 'cloudflare:workers');
          }
        }
      }
    ],
    build: {
      minify: false,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          banner: `if (typeof globalThis !== 'undefined' && typeof globalThis.MessageChannel === 'undefined') {
  class MockMessagePort extends EventTarget {
    constructor() { super(); this.onmessage = null; this._other = null; }
    postMessage(msg) {
      if (this._other) {
        queueMicrotask(() => {
          const ev = { data: msg };
          if (typeof this._other.onmessage === 'function') this._other.onmessage(ev);
        });
      }
    }
    start() {}
    close() {}
  }
  class MockMessageChannel {
    constructor() {
      this.port1 = new MockMessagePort();
      this.port2 = new MockMessagePort();
      this.port1._other = this.port2;
      this.port2._other = this.port1;
    }
  }
  globalThis.MessageChannel = MockMessageChannel;
  globalThis.MessagePort = MockMessagePort;
};`
        }
      }
    },
    resolve: {
      alias: [
        {
          find: 'astro/zod',
          replacement: fileURLToPath(new URL('./src/shims/astro-zod.mjs', import.meta.url))
        },
        {
          find: 'cloudflare:workers',
          replacement: fileURLToPath(new URL('./src/shims/cloudflare-workers.mjs', import.meta.url))
        },
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
        },
        {
          find: 'astro/app/entrypoint',
          replacement: fileURLToPath(new URL('./node_modules/astro/dist/core/app/index.js', import.meta.url))
        },
        {
          find: 'astro/app/manifest',
          replacement: fileURLToPath(new URL('./node_modules/astro/dist/core/app/index.js', import.meta.url))
        },
        {
          find: '@astrojs/cloudflare/image-transform-endpoint',
          replacement: fileURLToPath(new URL('./node_modules/@astrojs/cloudflare/dist/entrypoints/image-endpoint.js', import.meta.url))
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
        'zod',
        'emdash',
        '@emdash-cms/admin',
        '@emdash-cms/cloudflare',
        'cloudflare:workers'
      ]
    }
  }
});
