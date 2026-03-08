// =============================================================================
// Passport.js Configuration — Google & GitHub OAuth 2.0 strategies
// =============================================================================

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { AuthProvider } from '@prisma/client';
import { findOrCreateOAuthUser, OAuthProfile } from '../services/oauth.service';
import { logger } from '../utils/logger';

// ── Google OAuth 2.0 ────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL!;

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

                    const oauthProfile: OAuthProfile = {
                        provider: AuthProvider.GOOGLE,
                        providerId: profile.id,
                        email,
                        displayName: profile.displayName || email.split('@')[0],
                        avatarUrl: profile.photos?.[0]?.value,
                    };

                    const user = await findOrCreateOAuthUser(oauthProfile);
                    return done(null, user);
                } catch (err) {
                    logger.error('Google OAuth error', { error: (err as Error).message });
                    return done(err as Error, undefined);
                }
            },
        ),
    );
    logger.info('🔑 Google OAuth strategy registered');
} else {
    logger.warn('⚠️  Google OAuth credentials missing — strategy not registered');
}

// ── GitHub OAuth 2.0 ────────────────────────────────────────────────────────

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL!;

if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
    passport.use(
        new GitHubStrategy(
            {
                clientID: GITHUB_CLIENT_ID,
                clientSecret: GITHUB_CLIENT_SECRET,
                callbackURL: GITHUB_CALLBACK_URL,
                scope: ['user:email'],
            },
            async (
                _accessToken: string,
                _refreshToken: string,
                profile: any, // eslint-disable-line @typescript-eslint/no-explicit-any
                done: (err: Error | null, user?: Express.User) => void,
            ) => {
                try {
                    // GitHub may not expose the email in the profile object —
                    // the `user:email` scope provides it via profile.emails.
                    const email = (profile.emails && profile.emails[0]?.value) ||
                        `${profile.username}@github.placeholder`;

                    const oauthProfile: OAuthProfile = {
                        provider: AuthProvider.GITHUB,
                        providerId: profile.id,
                        email,
                        displayName: (profile.displayName || profile.username) as string,
                        avatarUrl: profile.photos?.[0]?.value,
                    };

                    const user = await findOrCreateOAuthUser(oauthProfile);
                    return done(null, user);
                } catch (err) {
                    logger.error('GitHub OAuth error', { error: (err as Error).message });
                    return done(err as Error, undefined);
                }
            },
        ),
    );
    logger.info('🔑 GitHub OAuth strategy registered');
} else {
    logger.warn('⚠️  GitHub OAuth credentials missing — strategy not registered');
}

// ── Serialisation (not used — we use JWTs, not sessions) ────────────────────

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as Express.User));

export default passport;
