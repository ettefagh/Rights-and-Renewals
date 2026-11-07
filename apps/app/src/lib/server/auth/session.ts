import { SignJWT, jwtVerify } from 'jose';

export const AUTH_COOKIE_NAME = 'cmlab_auth';
export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 * 6; // 6 months
export const PIN_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const PIN_LENGTH = 6;

export interface AuthPlatformEnv {
  PRIVATE_AUTH_SECRET?: string;
}

function getSecret(env?: AuthPlatformEnv): Uint8Array {
  const secret =
    env?.PRIVATE_AUTH_SECRET ||
    (typeof process !== 'undefined' ? process.env?.PRIVATE_AUTH_SECRET : undefined) ||
    'cmlab-development-auth-secret-32-chars-minimum!';
  return new TextEncoder().encode(secret);
}

export function generatePin(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  const val = values[0] ?? 0;
  return String(val % 1_000_000).padStart(PIN_LENGTH, '0');
}

export function getPinExpiration(): number {
  return Date.now() + PIN_TTL_MS;
}

export async function createPinHash(
  email: string,
  pin: string,
  expiresAt: number,
  env?: AuthPlatformEnv
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    getSecret(env) as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const data = new TextEncoder().encode(`${email.trim().toLowerCase()}\n${pin}\n${expiresAt}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const binary = String.fromCharCode(...new Uint8Array(signature));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createSessionToken(email: string, env?: AuthPlatformEnv): Promise<string> {
  return new SignJWT({ email: email.trim().toLowerCase(), verified: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_SESSION_TTL_SECONDS}s`)
    .sign(getSecret(env));
}

export async function createIcalToken(email: string, env?: AuthPlatformEnv): Promise<string> {
  return new SignJWT({ email: email.trim().toLowerCase(), scope: 'calendar_feed' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1y')
    .sign(getSecret(env));
}

export async function verifyIcalToken(token: string, env?: AuthPlatformEnv): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(env));
    if (payload.scope === 'calendar_feed' && typeof payload.email === 'string') {
      return payload.email;
    }
    return null;
  } catch {
    return null;
  }
}

export async function createBackupBaseSecret(email: string, env?: AuthPlatformEnv): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const data = new TextEncoder().encode(`${getSecret(env)}:${normalized}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const binary = String.fromCharCode(...new Uint8Array(digest));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
