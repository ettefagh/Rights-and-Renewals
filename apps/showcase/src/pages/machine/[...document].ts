import type { APIRoute } from 'astro';
import { getMachineDocument } from '../../data/machine-documents';

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const document = params.document === 'home' ? undefined : getMachineDocument(params.document);
  return new Response(document?.markdown ?? '# Document not found\n', {
    status: document ? 200 : 404,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
