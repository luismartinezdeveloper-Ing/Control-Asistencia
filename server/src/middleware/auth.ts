import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/jwtPayload';

/**
 * Extend Express Request to include the authenticated user payload.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return secret;
};

/**
 * Express middleware that verifies a JWT token from:
 * 1. HttpOnly cookie named 'token'
 * 2. Authorization header: Bearer <token>
 *
 * On success, attaches the decoded payload to `req.user`.
 * On failure, responds with 401.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Try cookie first, then Authorization header
  let token: string | undefined = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Token de autenticación no proporcionado.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getSecret()) as JWTPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.' });
      return;
    }
    res.status(401).json({ error: 'Token de sesión inválido o manipulado.' });
    return;
  }
}
