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
  // POST /auth/register (Closed System — 403 Forbidden for Public Self-Registration)
  // -----------------------------------------------------------------------
  describe('POST /auth/register', () => {
    it('should return 403 Forbidden because public self-registration is disabled', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('x-skip-rate-limit', 'true')
        .send({
          name: 'Public User',
          email: 'user@opeconca.net',
          password: 'TestPass123!',
          role: 'DEVELOPMENT_TEAM',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('deshabilitado');
    });
  });

  // -----------------------------------------------------------------------
  // Administrative User Management Endpoints (Internal Control)
  // -----------------------------------------------------------------------
  describe('Administrative User Management (Internal Control)', () => {
    it('should return 401 for /auth/admin/users without authentication', async () => {
      const res = await request(app).get('/auth/admin/users');
      expect(res.status).toBe(401);
    });

    it('should allow Product Owner to provision a new account via /auth/admin/users', async () => {
      // Login as Product Owner (Luis Martinez seed account)
      const loginRes = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'lmartinez@opeconca.net',
          password: 'Scrum2026!*',
        });

      const cookies = loginRes.headers['set-cookie'];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

      // Admin creates new user
      const createRes = await request(app)
        .post('/auth/admin/users')
        .set('Cookie', cookieHeader || '')
        .send({
          name: 'Nouveau Operador',
          email: 'operador@opeconca.net',
          password: 'Operador2026!*',
          role: 'DEVELOPMENT_TEAM',
          department: 'Operaciones',
          site: 'Oficina Opeconca',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.user).toBeDefined();
      expect(createRes.body.user.email).toBe('operador@opeconca.net');

      // Verify newly created user can log in
      const newLoginRes = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'operador@opeconca.net',
          password: 'Operador2026!*',
        });

      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.user.email).toBe('operador@opeconca.net');
    });

    it('should allow Product Owner to list all users via GET /auth/admin/users', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'lmartinez@opeconca.net',
          password: 'Scrum2026!*',
        });

      const cookies = loginRes.headers['set-cookie'];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

      const listRes = await request(app)
        .get('/auth/admin/users')
        .set('Cookie', cookieHeader || '');

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.users)).toBe(true);
      expect(listRes.body.users.length).toBeGreaterThanOrEqual(4);
    });

    it('should allow Product Owner to reset a user password via /auth/admin/users/reset-password', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'lmartinez@opeconca.net',
          password: 'Scrum2026!*',
        });

      const cookies = loginRes.headers['set-cookie'];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

      const resetRes = await request(app)
        .post('/auth/admin/users/reset-password')
        .set('Cookie', cookieHeader || '')
        .send({
          userId: 'usr_t_corona',
          newPassword: 'NewCoronaPass2026!*',
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.message).toContain('restablecida');

      // Verify T. Corona can log in with new password
      const coronaLoginRes = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'tcorona@opeconca.net',
          password: 'NewCoronaPass2026!*',
        });

      expect(coronaLoginRes.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // POST /auth/login
  // -----------------------------------------------------------------------
  describe('POST /auth/login', () => {
    it('should reject login for emails that do not belong to @opeconca.net', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'hacker@external.com',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('@opeconca.net');
    });

    it('should login with valid credentials and return 200 with cookie', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'lmartinez@opeconca.net',
          password: 'Scrum2026!*',
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('lmartinez@opeconca.net');
      expect(res.body.user.passwordHash).toBeUndefined();

      // Should set cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('should login with Ing. Luis Martinez seed account credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'lmartinez@opeconca.net',
          password: 'Scrum2026!*',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Ing. Luis Martinez');
      expect(res.body.user.email).toBe('lmartinez@opeconca.net');
      expect(res.body.user.role).toBe('PRODUCT_OWNER');
    });

    it('should return 401 with invalid password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'lmartinez@opeconca.net',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Contraseña incorrecta');
    });

    it('should return 401 for non-existent @opeconca.net email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'nonexistent@opeconca.net',
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
          email: 'lmartinez@opeconca.net',
          password: 'Scrum2026!*',
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
      expect(meRes.body.user.email).toBe('lmartinez@opeconca.net');
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
          email: 'lmartinez@opeconca.net',
          password: 'Scrum2026!*',
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
      expect(meRes.body.user.email).toBe('lmartinez@opeconca.net');
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
