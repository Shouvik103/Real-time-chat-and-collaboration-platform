// =============================================================================
// OTP Service — 6-Digit Email OTP generation, Redis caching, and Gmail SMTP delivery
// =============================================================================

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { redis } = require('../config/redis');
const { logger } = require('../utils/logger');

let smtpTransporter = null;

/**
 * Get or initialize Nodemailer SMTP transporter (e.g. Gmail SMTP)
 */
function getSmtpTransporter() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Only activate if real credentials are provided
    if (!user || !pass || user.includes('example.com') || pass.includes('dev_smtp')) {
        return null;
    }

    if (!smtpTransporter) {
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = parseInt(process.env.SMTP_PORT || '465', 10);
        smtpTransporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // true for 465 SSL, false for 587 TLS
            auth: {
                user: user.trim(),
                pass: pass.trim().replace(/\s+/g, ''), // support Google app password with or without spaces
            },
        });
    }
    return smtpTransporter;
}

const OTP_TTL_SECONDS = 600; // 10 minutes
const COOLDOWN_SECONDS = 60; // 60 seconds between resend requests
const MAX_ATTEMPTS = 5;      // Max failed attempts before code invalidation

// In-memory fallback map if Redis is temporarily offline during local dev
const fallbackStore = new Map();

function isRedisAvailable() {
    if (!redis) return false;
    // If mocked in test suites or connected in dev/prod
    if (redis.status === undefined || redis.status === 'ready' || redis.status === 'connect') {
        return true;
    }
    return false;
}

async function storageGet(key) {
    if (isRedisAvailable()) {
        try {
            return await redis.get(key);
        } catch {}
    }
    const item = fallbackStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
        fallbackStore.delete(key);
        return null;
    }
    return item.data;
}

async function storageSet(key, val, ex, ttlSeconds) {
    if (isRedisAvailable()) {
        try {
            return await redis.set(key, val, ex, ttlSeconds);
        } catch {}
    }
    fallbackStore.set(key, { data: val, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function storageDel(key) {
    if (isRedisAvailable()) {
        try {
            return await redis.del(key);
        } catch {}
    }
    fallbackStore.delete(key);
}

async function storageTtl(key) {
    if (isRedisAvailable()) {
        try {
            return await redis.ttl(key);
        } catch {}
    }
    const item = fallbackStore.get(key);
    if (!item) return -2;
    const remainingMs = item.expiresAt - Date.now();
    if (remainingMs <= 0) {
        fallbackStore.delete(key);
        return -2;
    }
    return Math.ceil(remainingMs / 1000);
}

function _clearFallbackStore() {
    fallbackStore.clear();
}

/**
 * Generate a cryptographically secure 6-digit numeric string (100000 - 999999)
 */
function generateSecureCode() {
    return crypto.randomInt(100000, 1000000).toString();
}

/**
 * HTML Email Template for OTP Verification
 */
function getEmailTemplate(code) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Email Verification Code</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; }
        .container { max-width: 520px; margin: 40px auto; background-color: #161b22; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #008B8B, #005f5f); padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 32px 28px; text-align: center; }
        .text { font-size: 15px; line-height: 1.6; color: #8b949e; margin-bottom: 24px; }
        .code-box { display: inline-block; background-color: #0d1117; border: 2px solid #008B8B; border-radius: 12px; padding: 16px 36px; margin: 12px 0 24px; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #ffffff; font-family: monospace; }
        .notice { font-size: 13px; color: #8b949e; line-height: 1.5; margin-top: 16px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #484f58; border-top: 1px solid rgba(255,255,255,0.06); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Real-Time Chat & Collaboration</h1>
        </div>
        <div class="content">
          <p class="text">Please enter the following 6-digit verification code to complete your registration:</p>
          <div class="code-box">${code}</div>
          <p class="notice">This verification code expires in <strong>10 minutes</strong>.<br>If you did not request this email, please ignore it.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Real-Time Chat Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    `;
}

/**
 * Dispatch Email via SMTP or Fallback to Console
 *
 * @param {string} email
 * @param {string} code
 * @returns {Promise<{ delivered: boolean, provider: string, messageId?: string }>}
 */
async function dispatchEmail(email, code) {
    // 1. Send via SMTP (Gmail) if configured
    const smtp = getSmtpTransporter();
    if (smtp) {
        try {
            const from = process.env.SMTP_FROM || `Instalk <${process.env.SMTP_USER}>`;
            const info = await smtp.sendMail({
                from,
                to: email,
                subject: `Your Verification Code: ${code}`,
                html: getEmailTemplate(code),
            });
            logger.info(`[OTP Service] SMTP email dispatched to ${email}`, { messageId: info.messageId });
            return { delivered: true, provider: 'smtp', messageId: info.messageId };
        } catch (err) {
            logger.warn(`[OTP Service] SMTP dispatch error: ${err.message}. Falling back to console logging.`);
        }
    }

    // Dev/Fallback banner: prints in terminal when testing without live SMTP
    console.log('\n' + '='.repeat(60));
    console.log(`[DEV OTP SERVICE] Verification code for: ${email}`);
    console.log(`>>> CODE: [ ${code} ] <<<`);
    console.log(`(Valid for 10 minutes | Enter this code in your registration form)`);
    console.log('='.repeat(60) + '\n');

    return { delivered: true, provider: 'console' };
}

/**
 * Generate and Send OTP to email
 *
 * @param {string} email
 * @returns {Promise<{ success: boolean, cooldownSeconds?: number, error?: string }>}
 */
async function generateAndSendOtp(email) {
    if (!email || typeof email !== 'string') {
        return { success: false, error: 'Valid email is required' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Resend Cooldown (60s)
    const cooldownKey = `otp_cooldown:${cleanEmail}`;
    const ttl = await storageTtl(cooldownKey);
    if (ttl > 0) {
        return {
            success: false,
            error: `Please wait ${ttl} seconds before requesting a new code.`,
            cooldownSeconds: ttl,
        };
    }

    // 2. Generate secure 6-digit code
    const code = generateSecureCode();

    // 3. Store in Redis/Storage with TTL (10 minutes)
    const otpKey = `otp:${cleanEmail}`;
    const payload = JSON.stringify({ code, attempts: 0 });
    await storageSet(otpKey, payload, 'EX', OTP_TTL_SECONDS);

    // 4. Set cooldown key (60 seconds)
    await storageSet(cooldownKey, '1', 'EX', COOLDOWN_SECONDS);

    // 5. Send via SMTP (or console fallback)
    await dispatchEmail(cleanEmail, code);

    return { success: true, cooldownSeconds: COOLDOWN_SECONDS };
}

/**
 * Verify OTP entered by the user
 *
 * @param {string} email
 * @param {string} code
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
async function verifyOtp(email, code) {
    if (!email || !code) {
        return { valid: false, error: 'Email and verification code are required' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const otpKey = `otp:${cleanEmail}`;

    const raw = await storageGet(otpKey);
    if (!raw) {
        return { valid: false, error: 'Verification code has expired or was not requested. Please request a new code.' };
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = { code: raw, attempts: 0 };
    }

    // Check code match
    if (parsed.code === cleanCode) {
        // Successful verification — clean up OTP from storage
        await storageDel(otpKey);
        await storageDel(`otp_cooldown:${cleanEmail}`);
        return { valid: true };
    }

    // Increment failed attempts
    const newAttempts = (parsed.attempts || 0) + 1;
    if (newAttempts >= MAX_ATTEMPTS) {
        // Destroy code to prevent brute force
        await storageDel(otpKey);
        return {
            valid: false,
            error: 'Too many incorrect attempts. This verification code has been invalidated. Please request a new one.',
        };
    }

    // Update attempts count with remaining TTL
    const remainingTtl = await storageTtl(otpKey);
    if (remainingTtl > 0) {
        parsed.attempts = newAttempts;
        await storageSet(otpKey, JSON.stringify(parsed), 'EX', remainingTtl);
    }

    const remaining = MAX_ATTEMPTS - newAttempts;
    return {
        valid: false,
        error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
}

module.exports = {
    generateAndSendOtp,
    verifyOtp,
    generateSecureCode,
    dispatchEmail,
    OTP_TTL_SECONDS,
    COOLDOWN_SECONDS,
    MAX_ATTEMPTS,
    _clearFallbackStore,
};
