import type { APIRoute } from 'astro';
import {
  constantTimeEqual,
  createPinHash,
  createSessionToken,
  createIcalToken,
  createBackupBaseSecret,
  AUTH_COOKIE_NAME,
  AUTH_SESSION_TTL_SECONDS
} from '../../../lib/server/auth/session.js';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const pin = String(body.pin || '').trim();
    const hash = String(body.hash || '');
    const expiresAt = Number(body.expiresAt);

    if (!email || !/^\d{6}$/.test(pin) || !hash || !expiresAt) {
      return new Response(JSON.stringify({ error: 'Invalid verification payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (Date.now() > expiresAt) {
      return new Response(JSON.stringify({ error: 'PIN has expired. Please request a new one.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const env = (locals as any)?.runtime?.env;
    const expectedHash = await createPinHash(email, pin, expiresAt, env);

    if (!constantTimeEqual(expectedHash, hash)) {
      return new Response(JSON.stringify({ error: 'Incorrect 6-digit PIN.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionToken = await createSessionToken(email, env);
    const icalToken = await createIcalToken(email, env);
    const baseSecret = await createBackupBaseSecret(email, env);

    cookies.set(AUTH_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: AUTH_SESSION_TTL_SECONDS
    });

    return new Response(
      JSON.stringify({
        verified: true,
        email,
        icalToken,
        baseSecret
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
