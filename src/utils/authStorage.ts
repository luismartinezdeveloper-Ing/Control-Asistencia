import { UserAccount, ScrumRole, ScrumSprint } from '../types/auth';
import { apiFetch, ApiError } from './api';
import { saveStoredJWTToken } from './jwt';

const AUTH_USER_KEY = 'attendance_app_current_user';
const SPRINT_DATA_KEY = 'attendance_app_scrum_sprint';

/**
 * Standard default demo password compliant with OWASP & NIST standards:
 * "Scrum2026!*" (contains uppercase, lowercase, numbers, and special symbols)
 * Also supports legacy "scrum2026"
 */
export const DEMO_PASSWORD_STANDARD = 'Scrum2026!*';
export const DEMO_PASSWORD_LEGACY = 'scrum2026';

/**
 * Strips sensitive password hash from the user object for in-memory session usage.
 */
export function sanitizeUser(user: UserAccount): UserAccount {
  const { passwordHash, ...safeUser } = user;
  return safeUser as UserAccount;
}

/**
 * Demo account data kept client-side for the Quick Login UI buttons only.
 * Actual authentication always goes through the backend.
 */
export const DEMO_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr_po_1',
    name: 'Ing. Carlos Mendoza',
    email: 'carlos.mendoza@empresa.com',
    role: 'PRODUCT_OWNER',
    roleTitle: 'Product Owner / Gerente General',
    department: 'Dirección General',
    site: 'Oficina Opeconca',
  },
  {
    id: 'usr_sm_1',
    name: 'Lic. Mariana Rivas',
    email: 'mariana.rivas@empresa.com',
    role: 'SCRUM_MASTER',
    roleTitle: 'Scrum Master / Jefe RRHH & Operaciones',
    department: 'Recursos Humanos y Auditoría',
    site: 'Oficina Opeconca',
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
  },
  {
    id: 'usr_stk_1',
    name: 'Dr. Roberto Salas',
    email: 'roberto.salas@auditoria.com',
    role: 'STAKEHOLDER',
    roleTitle: 'Stakeholder / Auditor Externo',
    department: 'Comité de Control y Finanzas',
    site: 'UNEFA',
  },
];

// ---------------------------------------------------------------------------
// API-backed authentication functions
// ---------------------------------------------------------------------------

/**
 * Authenticate a user via the backend /auth/login endpoint.
 * The server validates credentials, creates a JWT, and sets an HttpOnly cookie.
 */
export async function loginUser(
  email: string,
  plainPassword: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const data = await apiFetch<{ user: UserAccount }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password: plainPassword }),
    });

    return { success: true, user: data.user };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Error de conexión con el servidor de autenticación.' };
  }
}

/**
 * Register a new user via the backend /auth/register endpoint.
 */
export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  role?: ScrumRole;
  roleTitle?: string;
  department?: string;
  site?: string;
  linkedEmployeeName?: string;
  authCode?: string;
}): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const data = await apiFetch<{ user: UserAccount }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return { success: true, user: data.user };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Error de conexión con el servidor al registrar la cuenta.' };
  }
}

/**
 * Log out the current user — clears the HttpOnly cookie via backend
 * and removes the local user data.
 */
export async function logoutUser(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Even if the server call fails, clear local state
  }
  saveStoredCurrentUser(null);
  saveStoredJWTToken(null);
}

/**
 * Session verification: calls backend /auth/me to validate the HttpOnly cookie.
 * Returns the authenticated user if the session is valid.
 */
export async function verifyCurrentSession(): Promise<{
  valid: boolean;
  user: UserAccount | null;
  error?: string;
}> {
  const storedUser = getStoredCurrentUser();

  // If no stored user, session is invalid (no point calling backend)
  if (!storedUser) {
    return { valid: false, user: null };
  }

  try {
    const data = await apiFetch<{ user: UserAccount }>('/auth/me');
    return { valid: true, user: data.user };
  } catch (err) {
    // Session invalid — clear local storage
    saveStoredCurrentUser(null);
    saveStoredJWTToken(null);

    const errorMessage =
      err instanceof ApiError
        ? err.message
        : 'La sesión de usuario no es válida o ha caducado.';

    return { valid: false, user: null, error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// Local storage helpers (for user session data — NOT credentials)
// ---------------------------------------------------------------------------

export function getStoredCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
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

// ---------------------------------------------------------------------------
// Sprint storage (unchanged)
// ---------------------------------------------------------------------------

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
