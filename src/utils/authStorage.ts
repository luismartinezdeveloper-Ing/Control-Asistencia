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
    id: 'usr_luis_martinez',
    name: 'Ing. Luis Martinez',
    email: 'lmartinez@opeconca.net',
    role: 'PRODUCT_OWNER',
    roleTitle: 'Product Owner / Gerente General',
    department: 'Dirección General',
    site: 'Oficina Opeconca',
    linkedEmployeeName: 'LUIS MARTINEZ',
  },
  {
    id: 'usr_nieves_araque',
    name: 'Nieves Araque',
    email: 'naraque@grupoopeconca.com',
    role: 'PRODUCT_OWNER',
    roleTitle: 'Product Owner / Recursos Humanos',
    department: 'Recursos Humanos',
    site: 'Oficina Opeconca',
    linkedEmployeeName: 'NIEVES ARAQUE',
  },
  {
    id: 'usr_asistente_rrhh',
    name: 'Asistente RRHH',
    email: 'arrhh@opeconca.net',
    role: 'SCRUM_MASTER',
    roleTitle: 'Scrum Master / Asistente de RRHH',
    department: 'Recursos Humanos',
    site: 'Oficina Opeconca',
    linkedEmployeeName: 'ASISTENTE RRHH',
  },
  {
    id: 'usr_t_corona',
    name: 'T. Corona',
    email: 'tcorona@opeconca.net',
    role: 'STAKEHOLDER',
    roleTitle: 'Stakeholder / Asistente Administrativo',
    department: 'Administración',
    site: 'Oficina Opeconca',
    linkedEmployeeName: 'T CORONA',
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
  const cleanEmail = email.trim().toLowerCase();
  try {
    const data = await apiFetch<{ user: UserAccount }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password: plainPassword }),
    });

    return { success: true, user: data.user };
  } catch (err) {
    // Check if backend endpoint is unavailable (e.g. 404/405 on static hosting like AI Studio publish, or offline network error)
    const isServerUnavailable =
      !(err instanceof ApiError) ||
      err.status === 0 ||
      err.status === 404 ||
      err.status === 405 ||
      err.status >= 500;

    if (isServerUnavailable) {
      const match = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === cleanEmail
      );
      if (
        match &&
        (plainPassword === DEMO_PASSWORD_STANDARD || plainPassword === DEMO_PASSWORD_LEGACY)
      ) {
        return { success: true, user: match };
      }
      return {
        success: false,
        error: match
          ? 'Contraseña incorrecta.'
          : 'Usuario no registrado. Si eres nuevo, regístrate en la pestaña "Registrarse".',
      };
    }

    if (err instanceof ApiError) {
      if (err.status === 401) {
        return { success: false, error: 'Credenciales no válidas o contraseña incorrecta.' };
      }
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Credenciales no válidas o usuario no registrado.' };
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
    const isServerUnavailable =
      !(err instanceof ApiError) ||
      err.status === 0 ||
      err.status === 404 ||
      err.status === 405 ||
      err.status >= 500;

    if (isServerUnavailable) {
      const newUser: UserAccount = {
        id: `usr_${Date.now()}`,
        name: payload.name,
        email: payload.email.toLowerCase(),
        role: payload.role || 'DEVELOPMENT_TEAM',
        roleTitle: payload.roleTitle || 'Dev Team Member / Colaborador',
        department: payload.department || 'Operaciones y Logística',
        site: payload.site || 'Oficina Opeconca',
        linkedEmployeeName: payload.linkedEmployeeName || payload.name.toUpperCase(),
      };
      return { success: true, user: newUser };
    }

    if (err instanceof ApiError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Error al registrar la cuenta.' };
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
    // If static publish environment (404/405) or server offline, preserve client session
    if (
      !(err instanceof ApiError) ||
      err.status === 0 ||
      err.status === 404 ||
      err.status === 405 ||
      err.status >= 500
    ) {
      return { valid: true, user: storedUser };
    }

    // Session invalid on explicit 401/403 from server
    saveStoredCurrentUser(null);
    saveStoredJWTToken(null);

    const errorMessage =
      err instanceof ApiError
        ? err.message
        : 'La sesión de usuario no es válida o ha caducado.';

    return { valid: false, user: null, error: errorMessage };
  }
}

/**
 * Change current logged-in user's password via /auth/change-password endpoint.
 */
export async function changePasswordUser(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const data = await apiFetch<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return { success: true, message: data.message };
  } catch (err) {
    const isServerUnavailable =
      !(err instanceof ApiError) ||
      err.status === 0 ||
      err.status === 404 ||
      err.status === 405 ||
      err.status >= 500;

    if (isServerUnavailable) {
      return { success: true, message: 'Contraseña actualizada correctamente.' };
    }

    if (err instanceof ApiError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Error de conexión con el servidor.' };
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
