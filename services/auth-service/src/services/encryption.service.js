const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../utils/logger');

const ENCRYPTION_HOST = process.env.ENCRYPTION_ENGINE_HOST || 'localhost';
const ENCRYPTION_PORT = process.env.ENCRYPTION_ENGINE_PORT || '50051';

let client = null;

const getClient = () => {
    if (client) return client;
    const protoPath = path.resolve(__dirname, '../../proto/encryption.proto');
    try {
        const packageDef = protoLoader.loadSync(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        });
        const proto = grpc.loadPackageDefinition(packageDef);
        const EncryptionService = proto.encryption?.EncryptionService;
        if (!EncryptionService) {
            logger.warn('encryption.proto not found — encryption disabled');
            return null;
        }
        client = new EncryptionService(
            `${ENCRYPTION_HOST}:${ENCRYPTION_PORT}`,
            grpc.credentials.createInsecure(),
        );
        return client;
    } catch {
        logger.warn('Could not load encryption proto — encryption disabled');
        return null;
    }
};

/**
 * Encrypt plaintext via the C++ Encryption Engine.
 * Returns a JSON string containing { ciphertext, iv, auth_tag } so it can be
 * stored as a single MongoDB field.  Falls through to plaintext when the
 * engine is unavailable.
 */
const encrypt = (plaintext) => {
    const c = getClient();
    if (!c) return Promise.resolve(plaintext);
    return new Promise((resolve) => {
        c.Encrypt({ plaintext }, (err, res) => {
            if (err) {
                // Encryption engine unavailable — store plaintext so messages are never lost
                logger.warn('gRPC encrypt unavailable, storing plaintext', { error: err.message });
                resolve(plaintext);
            } else {
                resolve(JSON.stringify({
                    ciphertext: res.ciphertext,
                    iv: res.iv,
                    auth_tag: res.auth_tag,
                }));
            }
        });
    });
};

/**
 * Decrypt a value previously returned by encrypt().
 * Accepts either a JSON envelope or raw plaintext (for backwards compat).
 */
const decrypt = (stored) => {
    const c = getClient();
    if (!c) return Promise.resolve(stored);

    let payload;
    try {
        payload = JSON.parse(stored);
        if (!payload.ciphertext || !payload.iv || !payload.auth_tag) {
            return Promise.resolve(stored);
        }
    } catch {
        // Not JSON — treat as already-plaintext
        return Promise.resolve(stored);
    }

    return new Promise((resolve) => {
        c.Decrypt(payload, (err, res) => {
            if (err) {
                logger.warn('gRPC decrypt unavailable, returning stored value', { error: err.message });
                resolve(stored);
            } else {
                resolve(res.plaintext);
            }
        });
    });
};

module.exports = { encrypt, decrypt };
