import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User, Session } from '../src/database/models/index.js';
import { MockEmailService } from '../src/services/email/mock.email.service.js';
import { MockAIProvider } from '../src/services/ai/mock.provider.js';
import { MockVectorService } from '../src/services/vector/mock.vector.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { UserService } from '../src/modules/user/user.service.js';
import type { ApiResponse, AuthResponse, UserProfile } from '@omnitutor/shared';

describe('Authentication, Authorization & User Profile Endpoints', () => {
  let app: FastifyInstance;
  let emailService: MockEmailService;
  let authService: AuthService;
  let userService: UserService;

  beforeAll(async () => {
    // Connect to test database on local MongoDB instance
    await connectDatabase('mongodb://localhost:27017/omnitutor_test_auth');

    emailService = new MockEmailService('http://localhost:5173');
    authService = new AuthService(emailService);
    userService = new UserService();

    app = createApp({
      aiProvider: new MockAIProvider(),
      vectorService: new MockVectorService(),
      emailService,
      authService,
      userService,
      disableRequestLogging: true,
    });

    await app.ready();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await Session.deleteMany({});
      await disconnectDatabase();
    }
    await app.close();
  });

  beforeEach(async () => {
    emailService.clear();
    await User.deleteMany({});
    await Session.deleteMany({});
  });

  // Helper to extract session_token cookie from reply headers
  function extractCookie(headers: Record<string, string | string[] | undefined>): string {
    const raw = headers['set-cookie'];
    if (!raw) return '';
    const cookieStr = Array.isArray(raw) ? raw[0] : raw;
    const match = cookieStr?.match(/session_token=([^;]+)/);
    return match ? match[1] ?? '' : '';
  }

  describe('Registration Workflow', () => {
    it('Registers a new student account with least-privilege defaults and dispatches verification email', async () => {
      const payload = {
        email: 'alice@example.com',
        password: 'Password123!',
        fullName: 'Alice Student',
        preferences: {
          theme: 'dark' as const,
          preferredDifficulty: 'intermediate' as const,
        },
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload,
      });

      expect(res.statusCode).toBe(201);
      const body: ApiResponse<AuthResponse> = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data?.user.email).toBe('alice@example.com');
      expect(body.data?.user.fullName).toBe('Alice Student');
      expect(body.data?.user.role).toBe('student');
      expect(body.data?.user.isEmailVerified).toBe(false);
      expect(body.data?.csrfToken).toBeDefined();

      // Verify HttpOnly cookie was set
      const cookieVal = extractCookie(res.headers);
      expect(cookieVal).toBeTruthy();

      // Verify email was dispatched safely via injectable provider
      const sentEmails = emailService.getSentEmails();
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0]?.to).toBe('alice@example.com');
      expect(sentEmails[0]?.type).toBe('verification');
      expect(sentEmails[0]?.token).toBeDefined();
    });

    it('Rejects registration with invalid email or short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'not-an-email',
          password: 'short',
          fullName: 'X',
        },
      });

      expect(res.statusCode).toBe(400);
      const body: ApiResponse = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('Rejects duplicate email with 409 Conflict', async () => {
      const payload = {
        email: 'bob@example.com',
        password: 'Password123!',
        fullName: 'Bob Smith',
      };

      const firstRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload,
      });
      expect(firstRes.statusCode).toBe(201);

      const duplicateRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload,
      });
      expect(duplicateRes.statusCode).toBe(409);
      const body: ApiResponse = JSON.parse(duplicateRes.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('CONFLICT');
    });
  });

  describe('Login & Password Authentication', () => {
    beforeEach(async () => {
      // Register test user
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'charlie@example.com',
          password: 'CorrectPassword123!',
          fullName: 'Charlie Davis',
        },
      });
    });

    it('Logs in successfully with valid credentials and sets session cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'charlie@example.com',
          password: 'CorrectPassword123!',
        },
      });

      expect(res.statusCode).toBe(200);
      const body: ApiResponse<AuthResponse> = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data?.user.email).toBe('charlie@example.com');
      expect(body.data?.csrfToken).toBeDefined();

      const cookieVal = extractCookie(res.headers);
      expect(cookieVal).toBeTruthy();
    });

    it('Fails with generic 401 error on incorrect password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'charlie@example.com',
          password: 'WrongPassword999!',
        },
      });

      expect(res.statusCode).toBe(401);
      const body: ApiResponse = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('UNAUTHORIZED');
      expect(body.error?.message).toBe('Invalid email or password');
    });

    it('Fails with generic 401 error on non-existent email to prevent account enumeration', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        },
      });

      expect(res.statusCode).toBe(401);
      const body: ApiResponse = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error?.message).toBe('Invalid email or password');
    });
  });

  describe('Session Restoration, Cookie Auth, and CSRF Protection', () => {
    let sessionCookie: string;
    let csrfToken: string;

    beforeEach(async () => {
      const reg = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'diana@example.com',
          password: 'Password123!',
          fullName: 'Diana Prince',
        },
      });
      sessionCookie = extractCookie(reg.headers);
      const regBody: ApiResponse<AuthResponse> = JSON.parse(reg.body);
      csrfToken = regBody.data!.csrfToken;
    });

    it('Restores session via GET /api/v1/auth/me with session cookie', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: `session_token=${sessionCookie}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body: ApiResponse<AuthResponse> = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data?.user.email).toBe('diana@example.com');
      expect(body.data?.session?.isCurrent).toBe(true);
    });

    it('Rejects unauthenticated call to /api/v1/auth/me with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(res.statusCode).toBe(401);
    });

    it('Blocks state-changing requests when CSRF token is missing or invalid on cookie auth', async () => {
      // 1. Missing CSRF token
      const noCsrfRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/me',
        headers: {
          cookie: `session_token=${sessionCookie}`,
        },
        payload: { fullName: 'Diana Hacker' },
      });

      expect(noCsrfRes.statusCode).toBe(403);
      const noCsrfBody: ApiResponse = JSON.parse(noCsrfRes.body);
      expect(noCsrfBody.error?.code).toBe('FORBIDDEN');

      // 2. Tampered CSRF token
      const badCsrfRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/me',
        headers: {
          cookie: `session_token=${sessionCookie}`,
          'x-csrf-token': 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        },
        payload: { fullName: 'Diana Hacker' },
      });

      expect(badCsrfRes.statusCode).toBe(403);

      // 3. Valid CSRF token succeeds
      const validCsrfRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/me',
        headers: {
          cookie: `session_token=${sessionCookie}`,
          'x-csrf-token': csrfToken,
        },
        payload: { fullName: 'Diana Princess' },
      });

      expect(validCsrfRes.statusCode).toBe(200);
      const validBody: ApiResponse<UserProfile> = JSON.parse(validCsrfRes.body);
      expect(validBody.data?.fullName).toBe('Diana Princess');
    });

    it('Logs out and invalidates session token', async () => {
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          cookie: `session_token=${sessionCookie}`,
          'x-csrf-token': csrfToken,
        },
      });

      expect(logoutRes.statusCode).toBe(200);

      // Attempting to use the revoked session cookie must fail
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: `session_token=${sessionCookie}`,
        },
      });

      expect(meRes.statusCode).toBe(401);
    });
  });

  describe('Email Verification & Password Reset Lifecycles', () => {
    it('Completes email verification using safe single-use token', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'edward@example.com',
          password: 'Password123!',
          fullName: 'Edward Elric',
        },
      });

      const token = emailService.getLastVerificationToken('edward@example.com');
      expect(token).toBeDefined();

      // Submit verification token
      const verifyRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { token },
      });

      expect(verifyRes.statusCode).toBe(200);
      const verifyBody = JSON.parse(verifyRes.body);
      expect(verifyBody.data?.verified).toBe(true);
      expect(verifyBody.data?.user.isEmailVerified).toBe(true);

      // Single-use check: reusing same token must be rejected
      const reuseRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { token },
      });

      expect(reuseRes.statusCode).toBe(400);
    });

    it('Dispatches password reset email and enforces single-use expiry and session invalidation', async () => {
      const reg = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'fiona@example.com',
          password: 'OldPassword123!',
          fullName: 'Fiona Gallagher',
        },
      });
      const oldSessionCookie = extractCookie(reg.headers);

      // 1. Request password reset
      const forgotRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'fiona@example.com' },
      });
      expect(forgotRes.statusCode).toBe(200);

      const resetToken = emailService.getLastResetToken('fiona@example.com');
      expect(resetToken).toBeDefined();

      // 2. Complete reset with new password
      const resetRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetToken,
          newPassword: 'BrandNewPassword456!',
        },
      });
      expect(resetRes.statusCode).toBe(200);

      // 3. Old session must be invalidated
      const oldSessionCheck = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: `session_token=${oldSessionCookie}`,
        },
      });
      expect(oldSessionCheck.statusCode).toBe(401);

      // 4. Old password must fail login
      const oldLoginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'fiona@example.com',
          password: 'OldPassword123!',
        },
      });
      expect(oldLoginRes.statusCode).toBe(401);

      // 5. New password succeeds
      const newLoginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'fiona@example.com',
          password: 'BrandNewPassword456!',
        },
      });
      expect(newLoginRes.statusCode).toBe(200);

      // 6. Token reuse fails
      const reuseResetRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetToken,
          newPassword: 'AnotherPassword789!',
        },
      });
      expect(reuseResetRes.statusCode).toBe(400);
    });
  });

  describe('Role-Based Access Control and Account Deletion', () => {
    it('Blocks student from accessing admin routes with 403 Forbidden', async () => {
      const reg = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'student@example.com',
          password: 'Password123!',
          fullName: 'Student Only',
        },
      });
      const cookieVal = extractCookie(reg.headers);

      const adminRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: {
          cookie: `session_token=${cookieVal}`,
        },
      });

      expect(adminRes.statusCode).toBe(403);
      const body: ApiResponse = JSON.parse(adminRes.body);
      expect(body.error?.message).toContain("Requires 'admin' privileges");
    });

    it('Allows admin user to access /api/v1/admin/users', async () => {
      // Create user and elevate to admin directly in database
      const reg = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'admin@example.com',
          password: 'AdminPassword123!',
          fullName: 'Super Admin',
        },
      });
      const cookieVal = extractCookie(reg.headers);

      await User.updateOne({ email: 'admin@example.com' }, { $set: { role: 'admin' } });

      const adminRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: {
          cookie: `session_token=${cookieVal}`,
        },
      });

      expect(adminRes.statusCode).toBe(200);
      const body: ApiResponse<UserProfile[]> = JSON.parse(adminRes.body);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data?.some((u) => u.email === 'admin@example.com')).toBe(true);
    });

    it('Deletes account, revokes sessions, and blocks subsequent logins', async () => {
      const reg = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'george@example.com',
          password: 'Password123!',
          fullName: 'George Weasley',
        },
      });
      const cookieVal = extractCookie(reg.headers);
      const regBody: ApiResponse<AuthResponse> = JSON.parse(reg.body);
      const csrfToken = regBody.data!.csrfToken;

      // Delete account
      const delRes = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/me',
        headers: {
          cookie: `session_token=${cookieVal}`,
          'x-csrf-token': csrfToken,
        },
      });
      expect(delRes.statusCode).toBe(200);

      // Session revoked
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: `session_token=${cookieVal}`,
        },
      });
      expect(meRes.statusCode).toBe(401);

      // Login blocked
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'george@example.com',
          password: 'Password123!',
        },
      });
      expect(loginRes.statusCode).toBe(401);
    });
  });
});
