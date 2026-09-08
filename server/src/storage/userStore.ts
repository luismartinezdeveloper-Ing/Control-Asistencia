import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { ServerUserAccount, SanitizedUser } from '../types/jwtPayload';

const SALT_ROUNDS = 10;
const DATA_DIR = path.resolve(import.meta.dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

/**
 * Standard demo password: "Scrum2026!*"
 * Matches the frontend DEMO_PASSWORD_STANDARD constant.
 */
const DEMO_PASSWORD = 'Scrum2026!*';

/**
 * Demo accounts seeded on first startup — mirrors frontend DEMO_ACCOUNTS.
 */
const DEMO_ACCOUNTS_SEED: Omit<ServerUserAccount, 'passwordHash'>[] = [
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
// Internal helpers
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readUsersFile(): ServerUserAccount[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw) as ServerUserAccount[];
  } catch {
    return [];
  }
}

function writeUsersFile(users: ServerUserAccount[]): void {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Seeds demo accounts into the user store if the file is empty or missing.
 * Each demo account gets the same bcrypt-hashed password: Scrum2026!*
 */
export function seedDemoAccounts(): void {
  const existing = readUsersFile();
  if (existing.length > 0) return; // Already seeded

  const demoHash = bcrypt.hashSync(DEMO_PASSWORD, SALT_ROUNDS);

  const users: ServerUserAccount[] = DEMO_ACCOUNTS_SEED.map((acct) => ({
    ...acct,
    passwordHash: demoHash,
  }));

  writeUsersFile(users);
  console.log(`[userStore] Seeded ${users.length} demo accounts.`);
}

/**
 * Returns all stored users (with passwordHash — for internal use only).
 */
export function getUsers(): ServerUserAccount[] {
  return readUsersFile();
}

/**
 * Find a user by email (case-insensitive).
 */
export function getUserByEmail(email: string): ServerUserAccount | undefined {
  const users = readUsersFile();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * Find a user by ID.
 */
export function getUserById(id: string): ServerUserAccount | undefined {
  const users = readUsersFile();
  return users.find((u) => u.id === id);
}

/**
 * Add a new user to the store. Returns the created user.
 * Throws if a user with the same email already exists.
 */
export function addUser(user: ServerUserAccount): ServerUserAccount {
  const users = readUsersFile();
  const duplicate = users.find(
    (u) => u.email.toLowerCase() === user.email.toLowerCase()
  );
  if (duplicate) {
    throw new Error('DUPLICATE_EMAIL');
  }
  users.push(user);
  writeUsersFile(users);
  return user;
}

/**
 * Strips passwordHash from user object — safe for client responses.
 */
export function sanitizeUser(user: ServerUserAccount): SanitizedUser {
  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * Hash a plain-text password with bcrypt.
 */
export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, SALT_ROUNDS);
}

/**
 * Verify a plain-text password against a bcrypt hash.
 */
export function verifyPassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}
