/**
 * Scrum role types (mirrors frontend src/types/auth.ts)
 */
export type ScrumRole = 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPMENT_TEAM' | 'STAKEHOLDER';

/**
 * JWT payload interface — compatible with frontend JWTPayload
 * Used for signing and verifying tokens server-side.
 */
export interface JWTPayload {
  sub: string;
  name: string;
  email: string;
  role: ScrumRole;
  roleTitle: string;
  department?: string;
  site?: string;
  linkedEmployeeName?: string;
  iat?: number;   // Issued at (epoch seconds) — set by jsonwebtoken
  exp?: number;   // Expiration (epoch seconds) — set by jsonwebtoken
  iss?: string;   // Issuer
  jti?: string;   // Unique token ID
}

/**
 * Server-side user account shape.
 * Mirrors frontend UserAccount but with required passwordHash for stored users.
 */
export interface ServerUserAccount {
  id: string;
  name: string;
  email: string;
  role: ScrumRole;
  roleTitle: string;
  avatar?: string;
  department?: string;
  site?: string;
  linkedEmployeeName?: string;
  passwordHash: string;
}

/**
 * Sanitized user (no passwordHash) — safe to send to client.
 */
export type SanitizedUser = Omit<ServerUserAccount, 'passwordHash'>;
