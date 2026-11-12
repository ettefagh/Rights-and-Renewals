import type { APIRoute } from 'astro';
import { generatePin, getPinExpiration, createPinHash } from '../../../lib/server/auth/session.js';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pin = generatePin();
    const expiresAt = getPinExpiration();
    const env = (locals as any)?.runtime?.env;
    const hash = await createPinHash(email, pin, expiresAt, env);

    // Development Console Log for immediate verification/testing
    console.log(
      `\n========================================\n[AUTH PIN] Email: ${email} | PIN: ${pin}\n========================================\n`
    );

    return new Response(JSON.stringify({ hash, expiresAt }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
