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
 * Official default account seeded on first startup — Ing. Luis Martinez.
 */
const DEMO_ACCOUNTS_SEED: Omit<ServerUserAccount, 'passwordHash'>[] = [
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
  const tempFile = `${USERS_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(users, null, 2), 'utf-8');
  fs.renameSync(tempFile, USERS_FILE);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Seeds demo accounts into the user store if missing.
 * Each demo account gets the same bcrypt-hashed password: Scrum2026!*
 */
export function seedDemoAccounts(): ServerUserAccount[] {
  const demoHash = bcrypt.hashSync(DEMO_PASSWORD, SALT_ROUNDS);

  const users: ServerUserAccount[] = DEMO_ACCOUNTS_SEED.map((acct) => ({
    ...acct,
    passwordHash: demoHash,
  }));

  writeUsersFile(users);
  console.log(`[userStore] Seeded ${users.length} official user accounts.`);
  return users;
}

function getOrSeedUsers(): ServerUserAccount[] {
  let users = readUsersFile();
  if (users.length === 0) {
    users = seedDemoAccounts();
  } else {
    // Ensure all seed accounts exist in users.json
    let modified = false;
    const demoHash = bcrypt.hashSync(DEMO_PASSWORD, SALT_ROUNDS);
    DEMO_ACCOUNTS_SEED.forEach((seedAcc) => {
      const exists = users.some((u) => u.email.toLowerCase() === seedAcc.email.toLowerCase());
      if (!exists) {
        users.push({ ...seedAcc, passwordHash: demoHash });
        modified = true;
      }
    });
    if (modified) {
      writeUsersFile(users);
    }
  }
  return users;
}

/**
 * Returns all stored users (with passwordHash — for internal use only).
 */
export function getUsers(): ServerUserAccount[] {
  return getOrSeedUsers();
}

/**
 * Find a user by email (case-insensitive).
 */
export function getUserByEmail(email: string): ServerUserAccount | undefined {
  const users = getOrSeedUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * Find a user by ID.
 */
export function getUserById(id: string): ServerUserAccount | undefined {
  const users = getOrSeedUsers();
  return users.find((u) => u.id === id);
}

/**
 * Add a new user to the store. Returns the created user.
 * Throws if a user with the same email already exists.
 */
export function addUser(user: ServerUserAccount): ServerUserAccount {
  const users = getOrSeedUsers();
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
 * Update password for a specific user ID.
 */
export function updateUserPassword(id: string, newPasswordHash: string): boolean {
  const users = getOrSeedUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  users[idx].passwordHash = newPasswordHash;
  writeUsersFile(users);
  return true;
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
