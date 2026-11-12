import type { APIRoute } from 'astro';
import { getRequestContext, MediaRepository, type Database } from 'emdash';
import type { EmDashHandlers } from 'emdash/astro';
import { getPublishedPolicyLogoMediaId } from '../../../lib/policy-cms.js';

export const prerender = false;

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/x-icon',
]);

function notFound(): Response {
  return new Response('Not found', {
    status: 404,
    headers: {
      'Cache-Control': 'public, max-age=60',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function isSafeStorageKey(key: string): boolean {
  // EmDash's upload pipeline stores media as a ULID plus the original extension.
  // Refusing all other shapes also excludes transfer/archive prefixes in the shared bucket.
  return /^[0-9A-HJKMNP-TV-Z]{26}(?:\.[A-Za-z0-9]{1,10})?$/i.test(key);
}

function boundedBody(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let delivered = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        delivered += value.byteLength;
        if (delivered > MAX_LOGO_BYTES) {
          await reader.cancel('Logo exceeded the public size limit.');
          controller.error(new Error('Published logo exceeded the public size limit.'));
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export const GET: APIRoute = async ({ params, locals }) => {
  const slug = params.slug?.toLowerCase() ?? '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return notFound();

  const emdash = locals.emdash;
  if (!emdash?.storage) return new Response('Media unavailable', { status: 503 });

  try {
    const mediaId = await getPublishedPolicyLogoMediaId(slug);
    if (!mediaId) return notFound();

    // Public page middleware intentionally omits `locals.emdash.db` on its
    // anonymous fast path; the request-scoped database is carried in EmDash's
    // ALS context and is also what getEmDashEntry() used above.
    const requestDb = emdash.db ?? getRequestContext()?.db;
    if (!requestDb) return new Response('Media unavailable', { status: 503 });
    const media = await new MediaRepository(requestDb as EmDashHandlers['db']).findById(mediaId);
    if (!media || media.status !== 'ready' || !isSafeStorageKey(media.storageKey) ||
      !ALLOWED_IMAGE_TYPES.has(media.mimeType) || !media.size || media.size > MAX_LOGO_BYTES) {
      return notFound();
    }

    const file = await emdash.storage.download(media.storageKey);
    if (!ALLOWED_IMAGE_TYPES.has(file.contentType) || file.contentType !== media.mimeType ||
      !file.size || file.size > MAX_LOGO_BYTES) {
      await file.body.cancel('Logo metadata did not match the public image policy.').catch(() => undefined);
      return notFound();
    }

    return new Response(boundedBody(file.body), {
      headers: {
        'Cache-Control': 'public, max-age=60, must-revalidate',
        'Content-Length': String(file.size),
        'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self'",
        'Content-Type': file.contentType,
        'Content-Disposition': 'inline',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error(`[policy-logo] Failed to serve published logo for '${slug}'.`, error);
    return new Response('Media unavailable', { status: 503 });
  }
};
