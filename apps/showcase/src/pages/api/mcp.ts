import type { APIRoute } from 'astro';
import { handlePublicMcp } from '../../mcp/publicMcp';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handlePublicMcp(request);
export const OPTIONS: APIRoute = ({ request }) => handlePublicMcp(request);
