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

// Application Secret Key for client HMAC-SHA256 signature
const JWT_SECRET = 'opeconca_scrum_attendance_jwt_secure_key_2026_!';

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Computes HMAC-SHA256 signature using browser Web Cryptography API
 */
async function signHMACSHA256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(data)
  );

  const byteArray = new Uint8Array(signatureBuffer);
  let binaryString = '';
  for (let i = 0; i < byteArray.byteLength; i++) {
    binaryString += String.fromCharCode(byteArray[i]);
  }
  return base64UrlEncode(binaryString);
}

/**
 * Generates a signed RFC 7519 compliant JSON Web Token (JWT)
 * Default validity: 8 hours (28,800 seconds)
 */
export async function createJWT(
  user: UserAccount,
  expiresInSeconds: number = 8 * 3600
): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleTitle: user.roleTitle,
    department: user.department,
    site: user.site,
    linkedEmployeeName: user.linkedEmployeeName,
    iat: now,
    exp: now + expiresInSeconds,
    iss: 'opeconca-attendance-auth-service',
    jti: `jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = await signHMACSHA256(dataToSign, JWT_SECRET);
  return `${dataToSign}.${signature}`;
}

/**
 * Verifies JWT signature and checks expiration time (exp claim)
 */
export async function verifyJWT(
  token: string
): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token no proporcionado o formato inválido.' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Sesión no válida o formato incorrecto.' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  try {
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await signHMACSHA256(dataToVerify, JWT_SECRET);

    if (signature !== expectedSignature) {
      return { valid: false, error: 'No fue posible verificar la autenticidad de la sesión.' };
    }

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadJson) as JWTPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return {
        valid: false,
        error: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
        payload,
      };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Error al verificar la sesión de usuario.' };
  }
}

/**
 * Synchronous lightweight token decoder without signature check (useful for fast UI reads)
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
 * Storage helpers for JWT
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
