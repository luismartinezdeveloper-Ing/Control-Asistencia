import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import {
  getUsers,
  getUserByEmail,
  getUserById,
  addUser,
  updateUserPassword,
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
// POST /auth/register — DISABLED (Public Self-Registration is Closed)
// ---------------------------------------------------------------------------
router.post('/register', authLimiter, (_req: Request, res: Response) => {
  res.status(403).json({
    error: 'El auto-registro público está deshabilitado. El sistema funciona en modo cerrado. Solicite sus credenciales a Control Interno / Recursos Humanos.',
  });
});

// ---------------------------------------------------------------------------
// Protected Administrative User Management Endpoints (Internal Control)
// ---------------------------------------------------------------------------

/**
 * GET /auth/admin/users — List all accounts (Protected for PO / SM)
 */
router.get('/admin/users', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = req.user!;
    if (payload.role !== 'PRODUCT_OWNER' && payload.role !== 'SCRUM_MASTER') {
      res.status(403).json({ error: 'Permiso denegado: Reservado para Control Interno y Recursos Humanos.' });
      return;
    }

    const users = getUsers().map(sanitizeUser);
    res.json({ users });
  } catch (err) {
    console.error('[auth/admin/users] Error:', err);
    res.status(500).json({ error: 'Error al consultar usuarios.' });
  }
});

/**
 * POST /auth/admin/users — Provision a new account (Protected for PO / SM)
 */
router.post('/admin/users', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = req.user!;
    if (payload.role !== 'PRODUCT_OWNER' && payload.role !== 'SCRUM_MASTER') {
      res.status(403).json({ error: 'Permiso denegado: Reservado para Control Interno y Recursos Humanos.' });
      return;
    }

    const { name, email, password, role, roleTitle, department, site, linkedEmployeeName } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nombre, correo y contraseña inicial son obligatorios.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail.endsWith('@opeconca.net') && !normalizedEmail.endsWith('@grupoopeconca.com')) {
      res.status(400).json({
        error: 'El correo debe pertenecer al dominio corporativo @opeconca.net o @grupoopeconca.com.',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'La contraseña inicial debe tener al menos 8 caracteres.' });
      return;
    }

    if (getUserByEmail(email)) {
      res.status(409).json({ error: 'Ya existe un usuario registrado con este correo electrónico.' });
      return;
    }

    const userRole = role || 'DEVELOPMENT_TEAM';
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
      email: normalizedEmail,
      role: userRole,
      roleTitle: computedRoleTitle,
      department: department || 'Operaciones y Logística',
      site: site || 'Oficina Opeconca',
      linkedEmployeeName: linkedEmployeeName || name.trim().toUpperCase(),
      passwordHash: hashPassword(password),
    };

    addUser(newUser);

    res.status(201).json({ user: sanitizeUser(newUser) });
  } catch (err: any) {
    if (err.message === 'DUPLICATE_EMAIL') {
      res.status(409).json({ error: 'Ya existe un usuario registrado con este correo electrónico.' });
      return;
    }
    console.error('[auth/admin/users/create] Error:', err);
    res.status(500).json({ error: 'Error interno del servidor al crear usuario.' });
  }
});

/**
 * POST /auth/admin/users/reset-password — Admin password reset (Protected for PO / SM)
 */
router.post('/admin/users/reset-password', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = req.user!;
    if (payload.role !== 'PRODUCT_OWNER' && payload.role !== 'SCRUM_MASTER') {
      res.status(403).json({ error: 'Permiso denegado: Reservado para Control Interno y Recursos Humanos.' });
      return;
    }

    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      res.status(400).json({ error: 'El ID de usuario y la nueva contraseña son obligatorios.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    const targetUser = getUserById(userId);
    if (!targetUser) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const newHash = hashPassword(newPassword);
    const updated = updateUserPassword(targetUser.id, newHash);

    if (!updated) {
      res.status(500).json({ error: 'No se pudo restablecer la contraseña.' });
      return;
    }

    res.json({ message: `Contraseña restablecida exitosamente para ${targetUser.email}.` });
  } catch (err) {
    console.error('[auth/admin/users/reset-password] Error:', err);
    res.status(500).json({ error: 'Error al restablecer la contraseña.' });
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

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail.endsWith('@opeconca.net') && !normalizedEmail.endsWith('@grupoopeconca.com')) {
      res.status(400).json({
        error: 'Acceso restringido: Solo se permiten inicios de sesión con cuentas del dominio corporativo @opeconca.net o @grupoopeconca.com.',
      });
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
// POST /auth/change-password — Protected: Updates user password
// ---------------------------------------------------------------------------
router.post('/change-password', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = req.user!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'La contraseña actual y la nueva contraseña son obligatorias.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    const user = getUserById(payload.sub);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
      return;
    }

    const newHash = hashPassword(newPassword);
    const updated = updateUserPassword(user.id, newHash);

    if (!updated) {
      res.status(500).json({ error: 'No se pudo actualizar la contraseña.' });
      return;
    }

    res.json({ message: 'Contraseña actualizada exitosamente.' });
  } catch (err) {
    console.error('[auth/change-password] Error:', err);
    res.status(500).json({ error: 'Error interno del servidor al actualizar la contraseña.' });
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
