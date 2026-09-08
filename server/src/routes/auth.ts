import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import {
  getUserByEmail,
  getUserById,
  addUser,
  sanitizeUser,
  hashPassword,
  verifyPassword,
} from '../storage/userStore';
import { authMiddleware } from '../middleware/auth';
import { JWTPayload, ServerUserAccount } from '../types/jwtPayload';

const router = Router();

/**
 * Rate limiter for authentication endpoints: max 7 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7, // 7 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticación. Por favor intenta de nuevo en 15 minutos.' },
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-skip-rate-limit'] === 'true',
});

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return secret;
};

/**
 * Cookie options for the JWT token.
 */
function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 3600 * 1000, // 1 hour
    path: '/',
  };
}

/**
 * Sign a JWT for the given user.
 */
function signToken(user: ServerUserAccount): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleTitle: user.roleTitle,
    department: user.department,
    site: user.site,
    linkedEmployeeName: user.linkedEmployeeName,
    iss: 'opeconca-attendance-auth-service',
    jti: `jwt_${crypto.randomUUID()}`,
  };

  return jwt.sign(payload, getSecret(), { expiresIn: '1h' });
}

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------
router.post('/register', authLimiter, (req: Request, res: Response) => {
  try {
    const { name, email, password, role, roleTitle, department, site, linkedEmployeeName, authCode } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      res.status(400).json({ error: 'Correo electrónico no válido.' });
      return;
    }

    // Check password minimum length
    if (password.length < 8) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    // Check duplicate
    if (getUserByEmail(email)) {
      res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
      return;
    }

    // Elevated role authorization check
    const userRole = role || 'DEVELOPMENT_TEAM';
    if (userRole === 'PRODUCT_OWNER' || userRole === 'SCRUM_MASTER') {
      const validCode = process.env.ADMIN_AUTH_CODE || 'ADMIN2026';
      if (!authCode || authCode.trim() !== validCode) {
        res.status(403).json({
          error: `Para registrar un rol administrativo (${userRole.replace('_', ' ')}), se requiere un Código de Autorización Corporativo válido.`,
        });
        return;
      }
    }

    // Compute role title if not provided
    let computedRoleTitle = roleTitle;
    if (!computedRoleTitle) {
      if (userRole === 'PRODUCT_OWNER') computedRoleTitle = 'Product Owner / Gerente General';
      else if (userRole === 'SCRUM_MASTER') computedRoleTitle = 'Scrum Master / Jefe de Área';
      else if (userRole === 'STAKEHOLDER') computedRoleTitle = 'Stakeholder / Auditor';
      else computedRoleTitle = 'Dev Team Member / Colaborador';
    }

    const newUser: ServerUserAccount = {
      id: `usr_${crypto.randomUUID()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: userRole,
      roleTitle: computedRoleTitle,
      department: department || undefined,
      site: site || undefined,
      linkedEmployeeName: linkedEmployeeName || name.trim().toUpperCase(),
      passwordHash: hashPassword(password),
    };

    addUser(newUser);

    // Sign JWT and set cookie
    const token = signToken(newUser);
    res.cookie('token', token, getCookieOptions());

    res.status(201).json({ user: sanitizeUser(newUser) });
  } catch (err: any) {
    if (err.message === 'DUPLICATE_EMAIL') {
      res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
      return;
    }
    console.error('[auth/register] Error:', err);
    res.status(500).json({ error: 'Error interno del servidor al registrar la cuenta.' });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
router.post('/login', authLimiter, (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
      return;
    }

    const user = getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'No existe una cuenta registrada con este correo electrónico.' });
      return;
    }

    if (!verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Contraseña incorrecta. Por favor verifica tus credenciales.' });
      return;
    }

    // Sign JWT and set cookie
    const token = signToken(user);
    res.cookie('token', token, getCookieOptions());

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('[auth/login] Error:', err);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
});

// ---------------------------------------------------------------------------
// GET /auth/me — Protected: returns current authenticated user
// ---------------------------------------------------------------------------
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = req.user!;
    const user = getUserById(payload.sub);

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado en el sistema.' });
      return;
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('[auth/me] Error:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/logout — Clears the auth cookie
// ---------------------------------------------------------------------------
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Sesión cerrada exitosamente.' });
});

export default router;
