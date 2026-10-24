import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// Paths the app itself uses, so they can't be handed out as short codes
export const RESERVED = ['api', 'stats', 'assets', 'favicon.svg', 'robots.txt'];

export function generateCode(length = 7) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function isValidAlias(alias) {
  return /^[A-Za-z0-9_-]{3,30}$/.test(alias) && !RESERVED.includes(alias.toLowerCase());
}

// Returns a clean absolute URL string, or null if it isn't an http(s) URL
export function normalizeUrl(input) {
  if (typeof input !== 'string') return null;
  let value = input.trim();
  if (!value || value.length > 2048) return null;
  if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.toString();
  } catch {
    return null;
  }
}
