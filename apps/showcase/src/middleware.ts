import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // Capture Cloudflare Workers / Pages runtime bindings into globalThis.__CF_ENV__
  const cfEnv = (context.locals as any)?.runtime?.env;
  if (cfEnv) {
    if (!(globalThis as any).__CF_ENV__) {
      (globalThis as any).__CF_ENV__ = {};
    }
    Object.assign((globalThis as any).__CF_ENV__, cfEnv);
  }
  return next();
});
