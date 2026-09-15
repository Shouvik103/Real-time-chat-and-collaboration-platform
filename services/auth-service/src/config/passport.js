// =============================================================================
// Passport.js Configuration — Google OAuth 2.0 strategy
// =============================================================================

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { AuthProvider } = require('@prisma/client');
const { findOrCreateOAuthUser } = require('../services/oauth.service');
const { logger } = require('../utils/logger');

// ── Google OAuth 2.0 ────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: GOOGLE_CALLBACK_URL,
                scope: ['profile', 'email'],
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    if (!email) {
                        return done(new Error('Google account has no email address'), undefined);
                    }

                    const oauthProfile = {
                        provider: AuthProvider.GOOGLE,
                        providerId: profile.id,
                        email,
                        displayName: profile.displayName || email.split('@')[0],
                        avatarUrl: profile.photos?.[0]?.value,
                    };

                    const user = await findOrCreateOAuthUser(oauthProfile);
                    return done(null, user);
                } catch (err) {
                    logger.error('Google OAuth error', { error: err.message });
                    return done(err, undefined);
                }
            },
        ),
    );
    logger.info('🔑 Google OAuth strategy registered');
} else {
    logger.warn('⚠️  Google OAuth credentials missing — strategy not registered');
}

// ── Serialisation (not used — we use JWTs, not sessions) ────────────────────

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
