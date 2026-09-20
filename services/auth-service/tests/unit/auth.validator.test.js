// =============================================================================
// Auth Validator Unit Tests — Zod schemas
// =============================================================================

const {
  sendOtpSchema,
  registerSchema,
  loginSchema,
  refreshSchema,
} = require('../../src/validators/auth.validator');

describe('Auth Validators', () => {
  // ── sendOtpSchema ───────────────────────────────────────────────────────

  describe('sendOtpSchema', () => {
    it('should accept valid email address', () => {
      const result = sendOtpSchema.safeParse({ body: { email: 'user@example.com' } });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.email).toBe('user@example.com');
      }
    });

    it('should reject invalid email address', () => {
      const result = sendOtpSchema.safeParse({ body: { email: 'not-an-email' } });
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const result = sendOtpSchema.safeParse({ body: {} });
      expect(result.success).toBe(false);
    });
  });

  // ── registerSchema ──────────────────────────────────────────────────────

  describe('registerSchema', () => {
    const validInput = {
      body: {
        email: 'Test@Example.com',
        password: 'Str0ng@Pass',
        displayName: 'John Doe',
        otp: '123456',
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

    // ── 10 Password Test Cases & Edge Cases ────────────────────────────────
    describe('Password validation — 10 test cases & edge cases', () => {
      it('Pass Case 1: should accept Google suggested strong password with hyphens (e.g. wX8-qY2-zK9-mP4)', () => {
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: 'wX8-qY2-zK9-mP4' },
        });
        expect(result.success).toBe(true);
      });

      it('Pass Case 2: should accept password with underscore and exclamation (e.g. Str0ng_P@ssw0rd!)', () => {
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: 'Str0ng_P@ssw0rd!' },
        });
        expect(result.success).toBe(true);
      });

      it('Pass Case 3: should accept password containing space and symbols (e.g. P@ss w0rd#2026)', () => {
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: 'P@ss w0rd#2026' },
        });
        expect(result.success).toBe(true);
      });

      it('Pass Case 4: Boundary test — should accept exact minimum 8 characters meeting all criteria (e.g. Aa1!bbbb)', () => {
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: 'Aa1!bbbb' },
        });
        expect(result.success).toBe(true);
      });

      it('Pass Case 5: Boundary test — should accept exact maximum 128 characters meeting all criteria', () => {
        const maxPass = 'Aa1!' + 'b'.repeat(124);
        expect(maxPass.length).toBe(128);
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: maxPass },
        });
        expect(result.success).toBe(true);
      });

      it('Pass Case 6: Edge case — should reject password shorter than 8 characters (e.g. Aa1!bcd, 7 chars)', () => {
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: 'Aa1!bcd' },
        });
        expect(result.success).toBe(false);
      });

      it('Pass Case 7: Edge case — should reject password exceeding 128 characters (129 chars)', () => {
        const tooLongPass = 'Aa1!' + 'b'.repeat(125);
        expect(tooLongPass.length).toBe(129);
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: tooLongPass },
        });
        expect(result.success).toBe(false);
      });

      it('Pass Case 8: should reject password without uppercase letter (e.g. lowercase1@pass)', () => {
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: 'lowercase1@pass' },
        });
        expect(result.success).toBe(false);
      });

      it('Pass Case 9: should reject password without lowercase letter (e.g. UPPERCASE1@PASS)', () => {
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: 'UPPERCASE1@PASS' },
        });
        expect(result.success).toBe(false);
      });

      it('Pass Case 10: should reject password without numeric digit (e.g. NoDigits@Password!)', () => {
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: 'NoDigits@Password!' },
        });
        expect(result.success).toBe(false);
      });

      it('Pass Case 11: should reject password without special character or symbol (e.g. NoSpecial1Pass)', () => {
        const result = registerSchema.safeParse({
          body: { ...validInput.body, password: 'NoSpecial1Pass' },
        });
        expect(result.success).toBe(false);
      });
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

    it('should reject missing OTP code', () => {
      const { otp, ...bodyWithoutOtp } = validInput.body;
      const result = registerSchema.safeParse({ body: bodyWithoutOtp });
      expect(result.success).toBe(false);
    });

    it('should reject OTP with length other than 6', () => {
      const resultShort = registerSchema.safeParse({
        body: { ...validInput.body, otp: '12345' },
      });
      expect(resultShort.success).toBe(false);

      const resultLong = registerSchema.safeParse({
        body: { ...validInput.body, otp: '1234567' },
      });
      expect(resultLong.success).toBe(false);
    });

    it('should reject non-numeric OTP', () => {
      const result = registerSchema.safeParse({
        body: { ...validInput.body, otp: '12345a' },
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
