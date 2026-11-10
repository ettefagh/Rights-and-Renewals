import type { APIRoute } from 'astro';
import { handlePublicMcp } from '../../mcp/publicMcp';

export const prerender = false;
export const ALL: APIRoute = ({ request }) => handlePublicMcp(request);
export const POST = ALL;
export const OPTIONS = ALL;
