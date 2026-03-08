// =============================================================================
// Password Service — bcrypt hashing & comparison
// =============================================================================

import bcrypt from 'bcrypt';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

/**
 * Hash a plaintext password using bcrypt.
 * @param plaintext — The raw password from the user.
 * @returns The bcrypt hash (60 characters).
 */
export const hashPassword = async (plaintext: string): Promise<string> => {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
};

/**
 * Compare a plaintext password against a bcrypt hash.
 * @returns `true` if they match.
 */
export const comparePassword = async (
    plaintext: string,
    hash: string,
): Promise<boolean> => {
    return bcrypt.compare(plaintext, hash);
};
