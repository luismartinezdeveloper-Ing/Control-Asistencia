import { UserAccount, ScrumRole } from '../types/auth';

export interface JWTPayload {
  sub: string;
  name: string;
  email: string;
  role: ScrumRole;
  roleTitle: string;
  department?: string;
  site?: string;
  linkedEmployeeName?: string;
  iat: number; // Issued at (epoch seconds)
  exp: number; // Expiration (epoch seconds)
  iss: string; // Issuer
  jti?: string; // Unique token ID
}

export const JWT_STORAGE_KEY = 'attendance_app_jwt_token';

// ---------------------------------------------------------------------------
// SECURITY NOTE:
// JWT creation and signature verification are handled EXCLUSIVELY by the
// backend server (server/src/routes/auth.ts). Tokens are delivered via
// HttpOnly cookies and never exposed to JavaScript.
//
// The functions below only handle:
//   - decodeJWTSync: lightweight payload extraction for UI reads (no sig check)
//   - getStoredJWTToken / saveStoredJWTToken: localStorage helpers (fallback)
// ---------------------------------------------------------------------------

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Synchronous lightweight token decoder without signature check.
 * Useful for fast UI reads (e.g. display user name, check expiration for UX).
 * 
 * IMPORTANT: This does NOT verify the token's signature.
 * Actual authentication is always validated server-side via /auth/me.
 */
export function decodeJWTSync(token: string): JWTPayload | null {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = base64UrlDecode(parts[1]);
    return JSON.parse(payloadJson) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Checks if a decoded JWT payload has expired based on the exp claim.
 * Returns true if the token is still valid (not expired).
 */
export function isTokenNotExpired(payload: JWTPayload | null): boolean {
  if (!payload || !payload.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

/**
 * Storage helpers for JWT token (fallback for non-cookie scenarios)
 */
export function getStoredJWTToken(): string | null {
  try {
    return localStorage.getItem(JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveStoredJWTToken(token: string | null): void {
  try {
    if (!token) {
      localStorage.removeItem(JWT_STORAGE_KEY);
    } else {
      localStorage.setItem(JWT_STORAGE_KEY, token);
    }
  } catch (err) {
    console.warn('Error saving JWT token to storage:', err);
  }
}
