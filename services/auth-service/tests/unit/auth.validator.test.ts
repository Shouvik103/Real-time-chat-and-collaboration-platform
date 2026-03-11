// =============================================================================
// Auth Validator Unit Tests — Zod schemas
// =============================================================================

import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../../src/validators/auth.validator';

describe('Auth Validators', () => {
  // ── registerSchema ──────────────────────────────────────────────────────

  describe('registerSchema', () => {
    const validInput = {
      body: {
        email: 'Test@Example.com',
        password: 'Str0ng@Pass',
        displayName: 'John Doe',
      },
    };

    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        // email should be lowercased and trimmed
        expect(result.data.body.email).toBe('test@example.com');
      }
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        body: { ...validInput.body, email: 'not-an-email' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const { email, ...bodyWithout } = validInput.body;
      const result = registerSchema.safeParse({ body: bodyWithout });
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        body: { ...validInput.body, password: 'Ab1!' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase letter', () => {
      const result = registerSchema.safeParse({
        body: { ...validInput.body, password: 'lowercase1@pass' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase letter', () => {
      const result = registerSchema.safeParse({
        body: { ...validInput.body, password: 'UPPERCASE1@PASS' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without digit', () => {
      const result = registerSchema.safeParse({
        body: { ...validInput.body, password: 'NoDigits@Pass' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = registerSchema.safeParse({
        body: { ...validInput.body, password: 'NoSpecial1Pass' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject short display name', () => {
      const result = registerSchema.safeParse({
        body: { ...validInput.body, displayName: 'X' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject display name over 100 chars', () => {
      const result = registerSchema.safeParse({
        body: { ...validInput.body, displayName: 'a'.repeat(101) },
      });
      expect(result.success).toBe(false);
    });
  });

  // ── loginSchema ─────────────────────────────────────────────────────────

  describe('loginSchema', () => {
    const validLogin = {
      body: {
        email: 'user@test.com',
        password: 'anypassword',
      },
    };

    it('should accept valid login data', () => {
      const result = loginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({
        body: { password: 'pass' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        body: { ...validLogin.body, email: 'bad' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        body: { ...validLogin.body, password: '' },
      });
      expect(result.success).toBe(false);
    });
  });

  // ── refreshSchema ───────────────────────────────────────────────────────

  describe('refreshSchema', () => {
    it('should accept a refresh token', () => {
      const result = refreshSchema.safeParse({
        body: { refreshToken: 'some-token-string' },
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty body (cookie-based flow)', () => {
      const result = refreshSchema.safeParse({ body: {} });
      expect(result.success).toBe(true);
    });
  });
});
