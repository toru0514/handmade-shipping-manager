/**
 * セッショントークンのユーティリティ（Web Crypto API — Edge/Node 両対応）
 *
 * トークン形式: `{expiresAt_unix_ms}.{base64url_hmac_sha256}`
 */

export const COOKIE_NAME = 'hs_session';
const SESSION_DAYS = 7;

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toBase64url(buf: ArrayBuffer): string {
  let bin = '';
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64url(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob(base64 + pad);
  const buffer = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function createSessionToken(secret: string): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = String(exp);
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64url(sig)}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  if (!secret) return false;
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 1) return false;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const exp = Number(payload);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const key = await getKey(secret);
    return crypto.subtle.verify('HMAC', key, fromBase64url(sig), new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}
