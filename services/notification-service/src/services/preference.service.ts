import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface Preferences {
    pushEnabled: boolean;
    emailEnabled: boolean;
    muteUntil: Date | null;
    mutedChannels: string[];
}

export const getPreferences = async (userId: string): Promise<Preferences> => {
    const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (!pref) {
        return { pushEnabled: true, emailEnabled: true, muteUntil: null, mutedChannels: [] };
    }
    return {
        pushEnabled: pref.pushEnabled,
        emailEnabled: pref.emailEnabled,
        muteUntil: pref.muteUntil,
        mutedChannels: pref.mutedChannels,
    };
};

export const updatePreferences = async (
    userId: string,
    data: Partial<Pick<Preferences, 'pushEnabled' | 'emailEnabled' | 'muteUntil' | 'mutedChannels'>>,
) => {
    return prisma.notificationPreference.upsert({
        where: { userId },
        update: data,
        create: { userId, ...data },
    });
};

export const shouldNotify = async (userId: string, channelId?: string): Promise<boolean> => {
    const prefs = await getPreferences(userId);

    if (!prefs.pushEnabled) return false;

    // Global mute
    if (prefs.muteUntil && new Date() < prefs.muteUntil) return false;

    // Channel mute
    if (channelId && prefs.mutedChannels.includes(channelId)) return false;

    return true;
};
