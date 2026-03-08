import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { logger } from '../utils/logger';

const ENCRYPTION_HOST = process.env.ENCRYPTION_ENGINE_HOST || 'encryption-engine';
const ENCRYPTION_PORT = process.env.ENCRYPTION_ENGINE_PORT || '50051';

// ── Response / request shapes matching encryption.proto ─────────────────────

export interface EncryptedPayload {
    ciphertext: string;
    iv: string;
    auth_tag: string;
}

interface EncryptionGrpcClient {
    Encrypt(
        request: { plaintext: string },
        callback: (err: grpc.ServiceError | null, response: EncryptedPayload) => void,
    ): void;
    Decrypt(
        request: EncryptedPayload,
        callback: (err: grpc.ServiceError | null, response: { plaintext: string }) => void,
    ): void;
}

let client: EncryptionGrpcClient | null = null;

const getClient = (): EncryptionGrpcClient | null => {
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
        const proto = grpc.loadPackageDefinition(packageDef) as Record<string, any>;
        const EncryptionService = proto.encryption?.EncryptionService;
        if (!EncryptionService) {
            logger.warn('encryption.proto not found — encryption disabled');
            return null;
        }
        client = new EncryptionService(
            `${ENCRYPTION_HOST}:${ENCRYPTION_PORT}`,
            grpc.credentials.createInsecure(),
        ) as unknown as EncryptionGrpcClient;
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
export const encrypt = (plaintext: string): Promise<string> => {
    const c = getClient();
    if (!c) return Promise.resolve(plaintext);
    return new Promise((resolve, reject) => {
        c.Encrypt({ plaintext }, (err, res) => {
            if (err) {
                logger.error('gRPC encrypt error', { error: err.message });
                reject(err);
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
export const decrypt = (stored: string): Promise<string> => {
    const c = getClient();
    if (!c) return Promise.resolve(stored);

    let payload: EncryptedPayload;
    try {
        payload = JSON.parse(stored);
        if (!payload.ciphertext || !payload.iv || !payload.auth_tag) {
            return Promise.resolve(stored);
        }
    } catch {
        // Not JSON — treat as already-plaintext
        return Promise.resolve(stored);
    }

    return new Promise((resolve, reject) => {
        c.Decrypt(payload, (err, res) => {
            if (err) {
                logger.error('gRPC decrypt error', { error: err.message });
                reject(err);
            } else {
                resolve(res.plaintext);
            }
        });
    });
};
