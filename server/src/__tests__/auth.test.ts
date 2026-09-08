import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

// Set test environment before importing app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_vitest_only_!2026';
process.env.ADMIN_AUTH_CODE = 'ADMIN2026';

// We need to clear the users data file before tests
const DATA_DIR = path.resolve(import.meta.dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

import app from '../index';
import { seedDemoAccounts } from '../storage/userStore';

describe('Auth API', () => {
  beforeAll(() => {
    // Remove any existing users.json to start clean, then re-seed demo accounts
    if (fs.existsSync(USERS_FILE)) {
      fs.unlinkSync(USERS_FILE);
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Re-seed demo accounts fresh for these tests
    seedDemoAccounts();
  });

  afterAll(() => {
    // Cleanup test data
    if (fs.existsSync(USERS_FILE)) {
      fs.unlinkSync(USERS_FILE);
    }
  });

  // -----------------------------------------------------------------------
  // POST /auth/register
  // -----------------------------------------------------------------------
  describe('POST /auth/register', () => {
    it('should create a new user and return 201 with Set-Cookie', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('x-skip-rate-limit', 'true')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'TestPass123!',
          role: 'DEVELOPMENT_TEAM',
          department: 'TI',
          site: 'Oficina Test',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.role).toBe('DEVELOPMENT_TEAM');

      // Should NOT contain passwordHash
      expect(res.body.user.passwordHash).toBeUndefined();

      // Should set HttpOnly cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('token='))
        : cookies;
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
    });

    it('should return 409 if email already exists', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('x-skip-rate-limit', 'true')
        .send({
          name: 'Duplicate',
          email: 'test@example.com',
          password: 'TestPass123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Ya existe');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('x-skip-rate-limit', 'true')
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
    });

    it('should return 403 for elevated role without auth code', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('x-skip-rate-limit', 'true')
        .send({
          name: 'Wannabe Admin',
          email: 'admin@example.com',
          password: 'TestPass123!',
          role: 'PRODUCT_OWNER',
        });

      expect(res.status).toBe(403);
    });

    it('should allow elevated role with correct auth code', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('x-skip-rate-limit', 'true')
        .send({
          name: 'Real Admin',
          email: 'realadmin@example.com',
          password: 'TestPass123!',
          role: 'PRODUCT_OWNER',
          authCode: 'ADMIN2026',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('PRODUCT_OWNER');
    });

    it('should store passwords as bcrypt hashes (not plain text)', async () => {
      // Read the users file directly to verify
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      const testUser = users.find((u: any) => u.email === 'test@example.com');

      expect(testUser).toBeDefined();
      expect(testUser.passwordHash).toBeDefined();
      // bcrypt hashes start with $2a$ or $2b$
      expect(testUser.passwordHash).toMatch(/^\$2[ab]\$/);
      // Should NOT be the plain text password
      expect(testUser.passwordHash).not.toBe('TestPass123!');
    });
  });

  // -----------------------------------------------------------------------
  // POST /auth/login
  // -----------------------------------------------------------------------
  describe('POST /auth/login', () => {
    it('should login with valid credentials and return 200 with cookie', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.passwordHash).toBeUndefined();

      // Should set cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('should login with demo account credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'carlos.mendoza@empresa.com',
          password: 'Scrum2026!*',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Ing. Carlos Mendoza');
      expect(res.body.user.role).toBe('PRODUCT_OWNER');
    });

    it('should return 401 with invalid password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Contraseña incorrecta');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePass',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('No existe');
    });
  });

  // -----------------------------------------------------------------------
  // GET /auth/me (protected)
  // -----------------------------------------------------------------------
  describe('GET /auth/me', () => {
    it('should return 401 if no token/cookie is provided', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return 200 with user data when valid cookie is provided', async () => {
      // First login to get the cookie
      const loginRes = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
        });

      // Extract cookie from login response
      const cookies = loginRes.headers['set-cookie'];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

      // Use cookie to call /auth/me
      const meRes = await request(app)
        .get('/auth/me')
        .set('Cookie', cookieHeader || '');

      expect(meRes.status).toBe(200);
      expect(meRes.body.user).toBeDefined();
      expect(meRes.body.user.email).toBe('test@example.com');
      expect(meRes.body.user.passwordHash).toBeUndefined();
    });

    it('should return 401 with an invalid/forged token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', 'token=this.is.a.fake.token');

      expect(res.status).toBe(401);
    });

    it('should return 200 with valid Authorization Bearer header', async () => {
      // Login to get the cookie, extract token from it
      const loginRes = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
        });

      const cookies = loginRes.headers['set-cookie'];
      const cookieStr = Array.isArray(cookies) ? cookies[0] : cookies;
      // Extract token value from cookie
      const tokenMatch = cookieStr?.match(/token=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : '';

      const meRes = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe('test@example.com');
    });
  });

  // -----------------------------------------------------------------------
  // POST /auth/logout
  // -----------------------------------------------------------------------
  describe('POST /auth/logout', () => {
    it('should clear the token cookie', async () => {
      const res = await request(app).post('/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Sesión cerrada');

      // Cookie should be cleared (set to empty with past expiry)
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/health
  // -----------------------------------------------------------------------
  describe('GET /api/health', () => {
    it('should return status ok', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Rate Limiting Protection (7 attempts limit)
  // -----------------------------------------------------------------------
  describe('Rate Limiter Protection', () => {
    it('should block login requests after 7 failed attempts with 429 status', async () => {
      const email = `ratelimit_${Date.now()}@example.com`;

      // Send 7 requests (up to limit)
      for (let i = 0; i < 7; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email, password: 'wrongpassword' });
      }

      // 8th request should be blocked with 429
      const blockedRes = await request(app)
        .post('/auth/login')
        .send({ email, password: 'wrongpassword' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toContain('Demasiados intentos de autenticación');
    });
  });
});
