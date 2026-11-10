import type { APIRoute } from 'astro';
import { getMachineDocument } from '../../data/machine-documents';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const headers = { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' };
  try {
    const document = params.document === 'home' ? undefined : await getMachineDocument(params.document);
    return new Response(document?.markdown ?? '# Document not found\n', { status: document ? 200 : 404, headers });
  } catch (error) {
    console.error('[machine-documents] Failed to read published content.', error);
    return new Response('# Policy content is temporarily unavailable\n', { status: 503, headers });
  }
};
