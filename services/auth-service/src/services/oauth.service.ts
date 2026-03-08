// =============================================================================
// OAuth Service — find-or-create user from an OAuth profile
// Shared by the Google and GitHub Passport strategies
// =============================================================================

import { PrismaClient, AuthProvider, User } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface OAuthProfile {
    provider: AuthProvider;
    providerId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
}

/**
 * Locate an existing user by OAuth provider + providerId, or by email.
 * If neither exists, create a brand-new user.
 *
 * When a LOCAL user later signs in via OAuth with the same email,
 * we link the OAuth provider to the existing account instead of
 * creating a duplicate.
 */
export const findOrCreateOAuthUser = async (profile: OAuthProfile): Promise<User> => {
    // 1. Try to find by provider + providerId (exact OAuth match)
    const existingByProvider = await prisma.user.findFirst({
        where: {
            provider: profile.provider,
            providerId: profile.providerId,
        },
    });

    if (existingByProvider) {
        logger.info(`OAuth login — existing ${profile.provider} user ${existingByProvider.id}`);
        return existingByProvider;
    }

    // 2. Try to find by email (link OAuth to existing local account)
    const existingByEmail = await prisma.user.findUnique({
        where: { email: profile.email },
    });

    if (existingByEmail) {
        logger.info(`Linking ${profile.provider} to existing user ${existingByEmail.id}`);
        return prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
                provider: profile.provider,
                providerId: profile.providerId,
                // Update avatar only if the user doesn't already have one
                avatarUrl: existingByEmail.avatarUrl || profile.avatarUrl,
            },
        });
    }

    // 3. Brand new user
    logger.info(`Creating new ${profile.provider} user for ${profile.email}`);
    return prisma.user.create({
        data: {
            email: profile.email,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            provider: profile.provider,
            providerId: profile.providerId,
            password: null, // OAuth users have no local password
        },
    });
};
