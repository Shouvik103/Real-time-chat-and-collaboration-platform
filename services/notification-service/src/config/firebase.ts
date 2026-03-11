import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

let firebaseInitialized = false;

export const initFirebase = (): void => {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (serviceAccountPath) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        firebaseInitialized = true;
        logger.info('✅ Firebase Admin SDK initialized from service account');
    } else if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID,
        });
        firebaseInitialized = true;
        logger.info('✅ Firebase Admin SDK initialized with application default credentials');
    } else {
        logger.warn('⚠️  Firebase not configured — push notifications disabled');
    }
};

export const getMessaging = (): admin.messaging.Messaging | null => {
    if (!firebaseInitialized) return null;
    return admin.messaging();
};

export const isFirebaseReady = (): boolean => firebaseInitialized;
