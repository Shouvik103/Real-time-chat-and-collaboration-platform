import { logger } from '../utils/logger';

export interface ScanResult {
    clean: boolean;
    virus?: string;
    error?: string;
}

/**
 * ClamAV integration stub.
 * Replace with actual ClamAV TCP socket connection (clamd) when deployed.
 * For now, all files pass the scan.
 */
export const scanBuffer = async (buffer: Buffer, fileName: string): Promise<ScanResult> => {
    logger.info('Virus scan invoked (stub)', { fileName, size: buffer.length });

    // TODO: connect to ClamAV daemon via TCP
    // const socket = net.createConnection({ host: CLAMAV_HOST, port: CLAMAV_PORT });
    // send INSTREAM command + chunked buffer, parse response

    return { clean: true };
};
