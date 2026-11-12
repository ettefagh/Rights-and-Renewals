import type { APIRoute } from 'astro';

export const prerender = false;

export const ALL: APIRoute = async ({ request, locals }) => {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__EMDASH_RESET__) {
    (globalThis as any).__EMDASH_RESET__();
  }
  return new Response(
    JSON.stringify({
      success: true,
      message: 'EmDash Admin credentials have been reset. You can now configure your admin passkey.',
      setupUrl: '/_emdash/admin/setup'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    }
  );
};
