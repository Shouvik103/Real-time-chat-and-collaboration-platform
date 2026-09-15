// =============================================================================
// Password Service — bcrypt hashing & comparison
// =============================================================================

const bcrypt = require('bcrypt');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

/**
 * Hash a plaintext password using bcrypt.
 * @param {string} plaintext — The raw password from the user.
 * @returns {Promise<string>} The bcrypt hash (60 characters).
 */
const hashPassword = async (plaintext) => {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
};

/**
 * Compare a plaintext password against a bcrypt hash.
 * @returns {Promise<boolean>} `true` if they match.
 */
const comparePassword = async (plaintext, hash) => {
    return bcrypt.compare(plaintext, hash);
};

module.exports = { hashPassword, comparePassword };
