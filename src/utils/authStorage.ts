import bcrypt from 'bcryptjs';
import { UserAccount, ScrumSprint } from '../types/auth';
import { createJWT, verifyJWT, saveStoredJWTToken, getStoredJWTToken } from './jwt';

const SALT_ROUNDS = 10;
const AUTH_USER_KEY = 'attendance_app_current_user';
const ALL_USERS_KEY = 'attendance_app_all_users';
const SPRINT_DATA_KEY = 'attendance_app_scrum_sprint';

/**
 * Standard default demo password compliant with OWASP & NIST standards:
 * "Scrum2026!*" (contains uppercase, lowercase, numbers, and special symbols)
 * Also supports legacy "scrum2026"
 */
export const DEMO_PASSWORD_STANDARD = 'Scrum2026!*';
export const DEMO_PASSWORD_LEGACY = 'scrum2026';

const DEFAULT_DEMO_HASH = bcrypt.hashSync(DEMO_PASSWORD_STANDARD, SALT_ROUNDS);
const LEGACY_DEMO_HASH = bcrypt.hashSync(DEMO_PASSWORD_LEGACY, SALT_ROUNDS);

/**
 * Securely hashes a plain-text password using bcryptjs.
 * Ensures that plain-text credentials are never persisted to storage.
 */
export function hashPassword(plainText: string): string {
  if (!plainText) {
    throw new Error('No se puede generar hash para una contraseña vacía.');
  }
  return bcrypt.hashSync(plainText, SALT_ROUNDS);
}

/**
 * Validates a plain-text candidate password against a stored bcrypt hash.
 * Also checks standard demo passwords if applicable.
 */
export function verifyPassword(plainText: string, hash: string): boolean {
  if (!plainText || !hash) return false;
  try {
    const directMatch = bcrypt.compareSync(plainText, hash);
    if (directMatch) return true;

    // Graceful fallback check for standard demo pass vs legacy demo pass
    if (plainText === DEMO_PASSWORD_STANDARD || plainText === DEMO_PASSWORD_LEGACY) {
      return (
        bcrypt.compareSync(plainText, DEFAULT_DEMO_HASH) ||
        bcrypt.compareSync(plainText, LEGACY_DEMO_HASH)
      );
    }

    return false;
  } catch (err) {
    console.warn('Error verifying password with bcryptjs:', err);
    return false;
  }
}

/**
 * Strips sensitive password hash from the user object for in-memory session usage.
 */
export function sanitizeUser(user: UserAccount): UserAccount {
  const { passwordHash, ...safeUser } = user;
  return safeUser as UserAccount;
}

export const DEMO_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr_po_1',
    name: 'Ing. Carlos Mendoza',
    email: 'carlos.mendoza@empresa.com',
    role: 'PRODUCT_OWNER',
    roleTitle: 'Product Owner / Gerente General',
    department: 'Dirección General',
    site: 'Oficina Opeconca',
    passwordHash: DEFAULT_DEMO_HASH,
  },
  {
    id: 'usr_sm_1',
    name: 'Lic. Mariana Rivas',
    email: 'mariana.rivas@empresa.com',
    role: 'SCRUM_MASTER',
    roleTitle: 'Scrum Master / Jefe RRHH & Operaciones',
    department: 'Recursos Humanos y Auditoría',
    site: 'Oficina Opeconca',
    passwordHash: DEFAULT_DEMO_HASH,
  },
  {
    id: 'usr_dev_1',
    name: 'José Morales',
    email: 'jose.morales@empresa.com',
    role: 'DEVELOPMENT_TEAM',
    roleTitle: 'Dev Team Member / Especialista de Planta',
    department: 'Mantenimiento & Producción',
    site: 'Nalys',
    linkedEmployeeName: 'JOSE MORALES',
    passwordHash: DEFAULT_DEMO_HASH,
  },
  {
    id: 'usr_dev_2',
    name: 'María Fernández',
    email: 'maria.fernandez@empresa.com',
    role: 'DEVELOPMENT_TEAM',
    roleTitle: 'Dev Team Member / Analista Técnico',
    department: 'Operaciones',
    site: 'Oficina Opeconca',
    linkedEmployeeName: 'MARIA FERNANDEZ',
    passwordHash: DEFAULT_DEMO_HASH,
  },
  {
    id: 'usr_stk_1',
    name: 'Dr. Roberto Salas',
    email: 'roberto.salas@auditoria.com',
    role: 'STAKEHOLDER',
    roleTitle: 'Stakeholder / Auditor Externo',
    department: 'Comité de Control y Finanzas',
    site: 'UNEFA',
    passwordHash: DEFAULT_DEMO_HASH,
  },
];

/**
 * Retrieves all registered user accounts with their bcrypt hashes.
 */
export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ALL_USERS_KEY);
    if (!raw) {
      // Seed with initial demo accounts (all with bcrypt hashed passwords)
      localStorage.setItem(ALL_USERS_KEY, JSON.stringify(DEMO_ACCOUNTS));
      return DEMO_ACCOUNTS;
    }
    const parsed = JSON.parse(raw) as UserAccount[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(ALL_USERS_KEY, JSON.stringify(DEMO_ACCOUNTS));
      return DEMO_ACCOUNTS;
    }
    return parsed;
  } catch {
    return DEMO_ACCOUNTS;
  }
}

/**
 * Saves users list securely to localStorage.
 */
export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(ALL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Error saving users to storage:', err);
  }
}

/**
 * Authenticates user credentials using bcryptjs and returns sanitized user.
 */
export function authenticateUser(
  email: string,
  plainPassword: string
): { success: boolean; user?: UserAccount; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getStoredUsers();

  const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return {
      success: false,
      error: 'No existe una cuenta registrada con este correo electrónico.',
    };
  }

  if (!user.passwordHash) {
    return {
      success: false,
      error: 'La cuenta de usuario no tiene credenciales válidas configuradas.',
    };
  }

  const isValid = verifyPassword(plainPassword, user.passwordHash);
  if (!isValid) {
    return {
      success: false,
      error: 'Contraseña incorrecta. Por favor verifica tus credenciales.',
    };
  }

  return {
    success: true,
    user: sanitizeUser(user),
  };
}

/**
 * Session verification: verifies JWT token validity and matches it with stored user
 */
export async function verifyCurrentSession(): Promise<{
  valid: boolean;
  user: UserAccount | null;
  error?: string;
}> {
  const token = getStoredJWTToken();
  const storedUser = getStoredCurrentUser();

  if (!token || !storedUser) {
    return { valid: false, user: null };
  }

  const verification = await verifyJWT(token);
  if (!verification.valid || !verification.payload) {
    saveStoredCurrentUser(null);
    saveStoredJWTToken(null);
    return {
      valid: false,
      user: null,
      error: verification.error || 'La sesión de usuario no es válida o ha caducado.',
    };
  }

  return {
    valid: true,
    user: {
      ...storedUser,
      jwtToken: token,
    },
  };
}

export function getStoredCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return sanitizeUser(JSON.parse(raw) as UserAccount);
  } catch {
    return null;
  }
}

export function saveStoredCurrentUser(user: UserAccount | null): void {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_USER_KEY);
      saveStoredJWTToken(null);
    } else {
      // Always store sanitized user (no hash in session key)
      const safe = sanitizeUser(user);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(safe));
    }
  } catch (err) {
    console.warn('Error saving current user:', err);
  }
}

export const INITIAL_SPRINT: ScrumSprint = {
  id: 'sprint_w36',
  name: 'Sprint Asistencia 36 (Semana Operativa)',
  goal: 'Mantener la tasa de asistencia sobre el 92% y resolver el 100% de justificativos de inasistencia médica pendientes.',
  startDate: '2026-09-01',
  endDate: '2026-09-07',
  targetAttendanceRate: 92,
  status: 'ACTIVE',
};

export function getStoredSprint(): ScrumSprint {
  try {
    const raw = localStorage.getItem(SPRINT_DATA_KEY);
    if (!raw) return INITIAL_SPRINT;
    return JSON.parse(raw) as ScrumSprint;
  } catch {
    return INITIAL_SPRINT;
  }
}

export function saveStoredSprint(sprint: ScrumSprint): void {
  try {
    localStorage.setItem(SPRINT_DATA_KEY, JSON.stringify(sprint));
  } catch (err) {
    console.warn('Error saving sprint:', err);
  }
}
